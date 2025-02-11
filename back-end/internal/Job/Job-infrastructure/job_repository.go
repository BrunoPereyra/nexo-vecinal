package jobinfrastructure

import (
	jobdomain "back-end/internal/Job/Job-domain"
	userdomain "back-end/internal/user/user-domain"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type JobRepository struct {
	redisClient *redis.Client
	mongoClient *mongo.Client
}

func NewjobRepository(redisClient *redis.Client, mongoClient *mongo.Client) *JobRepository {
	return &JobRepository{
		redisClient: redisClient,
		mongoClient: mongoClient,
	}
}
func (t *JobRepository) CreateJob(Tweet jobdomain.Job) (primitive.ObjectID, error) {
	banned, err := t.IsUserBanned(Tweet.UserID)
	if err != nil {
		return primitive.ObjectID{}, err
	}
	if banned {
		return primitive.ObjectID{}, errors.New("without permission")

	}
	GoMongoDBCollUsers := t.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	result, errInsertOne := GoMongoDBCollUsers.InsertOne(context.Background(), Tweet)
	if errInsertOne != nil {
		return primitive.ObjectID{}, errInsertOne
	}
	insertedID := result.InsertedID.(primitive.ObjectID)
	return insertedID, nil
}

// IsUserBanned verifica si el usuario se encuentra baneado.

func (j *JobRepository) IsUserBanned(userId primitive.ObjectID) (bool, error) {
	// Conexión a la colección de Usuarios
	GoMongoDBCollUsers := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	// Buscar al usuario por su ID
	var user struct {
		Banned bool `bson:"Banned"`
	}
	err := GoMongoDBCollUsers.FindOne(context.Background(), bson.D{{Key: "_id", Value: userId}}).Decode(&user)
	if err != nil {
		return false, fmt.Errorf("no se pudo encontrar al usuario: %v", err)
	}

	// Devolver el estado de baneado
	return user.Banned, nil
}

// ApplyToJob permite que un trabajador se postule a un job agregando su ID a la lista de applicants.
func (j *JobRepository) ApplyToJob(jobID, applicantID primitive.ObjectID) error {
	// 1. Verificar si el usuario cumple con las condiciones para aplicar
	canApply, err := j.canUserApply(applicantID)
	if err != nil {
		return err
	}
	if !canApply {
		return errors.New("el usuario necesita Prime para aplicar a más de dos trabajos")
	}

	// 2. Agregar el usuario a la lista de aplicantes del trabajo
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$addToSet": bson.M{"applicants": applicantID}, // $addToSet evita duplicados
		"$set":      bson.M{"updatedAt": time.Now()},
	}

	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}

	return nil
}

func (j *JobRepository) canUserApply(userID primitive.ObjectID) (bool, error) {
	userColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var user userdomain.User

	err := userColl.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, errors.New("user not found")
		}
		return false, err
	}

	// Verificar si el usuario tiene Prime activo
	now := time.Now()
	isPrimeActive := user.Prime.SubscriptionStart.Before(now) && user.Prime.SubscriptionEnd.After(now)

	if user.CompletedJobs >= 2 && !isPrimeActive {
		return false, nil
	}

	return true, nil
}

// AssignJob permite que el empleador asigne un job a un trabajador, actualizando el estado a "in_progress".
func (j *JobRepository) AssignJob(jobID, workerID primitive.ObjectID) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"assignedTo": workerID,
			"status":     jobdomain.JobStatusInProgress,
			"updatedAt":  time.Now(),
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}

func (j *JobRepository) UpdateJobStatusToCompleted(jobID, idUser primitive.ObjectID) (*jobdomain.Job, error) {
	// 1. Traer el documento del job
	job, err := j.GetJobByID(jobID)
	if err != nil {
		return nil, err
	}

	// Si ya está completado, devolvemos un error
	if job.Status == jobdomain.JobStatusCompleted {
		return nil, errors.New("job already completed")
	}

	// 2. Actualizar el estado a completed (solo si no es completed)
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{
		"_id":    jobID,
		"userId": idUser,
		"status": bson.M{"$ne": jobdomain.JobStatusCompleted},
	}
	update := bson.M{
		"$set": bson.M{
			"status":    jobdomain.JobStatusCompleted,
			"updatedAt": time.Now(),
		},
	}

	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, errors.New("job not found or already completed")
	}

	// 3. Traer el documento actualizado para usar sus datos (por ejemplo, los IDs para incrementar contadores)
	updatedJob, err := j.GetJobByID(jobID)
	if err != nil {
		return nil, err
	}

	// 4. Incrementar los contadores de trabajos completados para el empleador y el trabajador
	if err := j.incrementUserJobCount(updatedJob.UserID); err != nil {
		return nil, err
	}
	if updatedJob.AssignedTo != nil {
		if err := j.incrementUserJobCount(*updatedJob.AssignedTo); err != nil {
			return nil, err
		}
	}

	// Devolver el documento actualizado
	return updatedJob, nil
}

// incrementUserJobCount incrementa en 1 el contador de trabajos completados de un usuario.
func (j *JobRepository) incrementUserJobCount(userID primitive.ObjectID) error {
	userColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$inc": bson.M{"completedJobs": 1}, // Suma 1 al contador de trabajos completados
	}

	result, err := userColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("user not found")
	}
	return nil
}

// ReassignJob permite al empleador reasignar el job a un nuevo trabajador en caso de inconvenientes.
func (j *JobRepository) ReassignJob(jobID, newWorkerID primitive.ObjectID) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"assignedTo": newWorkerID,
			// Se asume que al reasignar el job se mantiene en estado "in_progress"
			"status":    jobdomain.JobStatusInProgress,
			"updatedAt": time.Now(),
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}

// ProvideEmployerFeedback permite que el empleador deje feedback sobre el trabajador.
func (j *JobRepository) ProvideEmployerFeedback(jobID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"employerFeedback": feedback,
			"updatedAt":        time.Now(),
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}

// ProvideWorkerFeedback permite que el trabajador deje feedback sobre el empleador.
func (j *JobRepository) ProvideWorkerFeedback(jobID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"workerFeedback": feedback,
			"updatedAt":      time.Now(),
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}
	return nil
}
func (j *JobRepository) UpdateJob(jobID primitive.ObjectID, update bson.M) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}

	_, err := jobColl.UpdateOne(context.Background(), filter, update)
	return err
}
func (j *JobRepository) GetJobByID(jobID primitive.ObjectID) (*jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	var job jobdomain.Job

	filter := bson.M{"_id": jobID}
	err := jobColl.FindOne(context.Background(), filter).Decode(&job)
	if err != nil {
		return nil, err
	}

	return &job, nil
}
func (j *JobRepository) UpdateJobPaymentStatus(jobID primitive.ObjectID, status string, paymentIntentID string) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	filter := bson.M{"_id": jobID}
	update := bson.M{"$set": bson.M{"payment_status": status, "payment_intent_id": paymentIntentID}}

	_, err := jobColl.UpdateOne(context.Background(), filter, update)
	return err
}
func (j *JobRepository) FindJobsByTagsAndLocation(jobFilter jobdomain.FindJobsByTagsAndLocation) ([]jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Convertir el radio de metros a radianes (radio terrestre ≈ 6,378,100 metros)
	radiusInRadians := jobFilter.RadiusInMeters / 6378100.0

	// Crear el filtro:
	// - Se filtran los trabajos que tengan al menos una etiqueta dentro del slice "tags".
	// - Se filtran aquellos trabajos cuya ubicación se encuentre dentro de un círculo definido
	//   por el centro [lon, lat] y el radio en radianes.
	filter := bson.M{
		"tags": bson.M{
			"$in": jobFilter.Tags,
		},
		"location": bson.M{
			"$geoWithin": bson.M{
				"$centerSphere": []interface{}{
					[]float64{jobFilter.Longitude, jobFilter.Latitude},
					radiusInRadians,
				},
			},
		},
	}

	// Ejecutar la consulta
	cursor, err := jobColl.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err = cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}
