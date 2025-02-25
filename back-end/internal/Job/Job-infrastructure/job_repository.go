package jobinfrastructure

import (
	jobdomain "back-end/internal/Job/Job-domain"
	userdomain "back-end/internal/user/user-domain"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

// ApplyToJob permite que un trabajador se postule a un job agregando su aplicación (con propuesta y precio).
func (j *JobRepository) ApplyToJob(jobID, applicantID primitive.ObjectID, proposal string, price float64) error {
	// Validar que la propuesta no exceda los 100 caracteres.
	if len(proposal) > 100 {
		return errors.New("la propuesta excede los 100 caracteres")
	}

	// Verificar si el usuario cumple con las condiciones para aplicar.
	canApply, err := j.canUserApply(applicantID)
	if err != nil {
		return err
	}
	if !canApply {
		return errors.New("el usuario necesita Prime para aplicar a más de dos trabajos")
	}

	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	// Usamos un filtro que evite agregar la misma postulación dos veces.
	filter := bson.M{
		"_id":                    jobID,
		"applicants.applicantId": bson.M{"$ne": applicantID},
	}
	newApplication := bson.M{
		"applicantId": applicantID,
		"proposal":    proposal,
		"price":       price,
		"appliedAt":   time.Now(),
	}
	update := bson.M{
		"$push": bson.M{"applicants": newApplication},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not encontrado o ya existe una postulación del usuario")
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

	if user.CompletedJobs >= 20 && !isPrimeActive {
		return false, nil
	}

	return true, nil
}

// AssignJob permite que el empleador asigne un job a un trabajador
// tomando la postulación del usuario (Application) y actualizando el estado a "in_progress".
func (j *JobRepository) AssignJob(jobID, applicantID primitive.ObjectID) error {
	// Primero se obtiene el job para buscar la postulación del applicantID.
	job, err := j.GetJobByID(jobID)
	if err != nil {
		return err
	}

	var selectedApp jobdomain.Application
	found := false
	for _, app := range job.Applicants {
		if app.ApplicantID == applicantID {
			selectedApp = app
			found = true
			break
		}
	}
	if !found {
		return errors.New("no se encontró la postulación del usuario")
	}

	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"assignedApplication": selectedApp,
			"status":              jobdomain.JobStatusInProgress,
			"updatedAt":           time.Now(),
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job no encontrado")
	}
	return nil
}

func (j *JobRepository) UpdateJobStatusToCompleted(jobID, idUser primitive.ObjectID) (*jobdomain.Job, error) {
	job, err := j.GetJobByID(jobID)
	if err != nil {
		return nil, err
	}
	if job.Status == jobdomain.JobStatusCompleted {
		return nil, errors.New("job already completed")
	}
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
	updatedJob, err := j.GetJobByID(jobID)
	if err != nil {
		return nil, err
	}
	// Incrementar el contador para el empleador
	if err := j.incrementUserJobCount(updatedJob.UserID); err != nil {
		return nil, err
	}
	// Incrementar el contador para el trabajador asignado (si existe)
	if updatedJob.AssignedApplication != nil {
		if err := j.incrementUserJobCount(updatedJob.AssignedApplication.ApplicantID); err != nil {
			return nil, err
		}
	}
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
	// Primero se obtiene el job para buscar la postulación del newWorkerID.
	job, err := j.GetJobByID(jobID)
	if err != nil {
		return err
	}

	var selectedApp jobdomain.Application
	found := false
	for _, app := range job.Applicants {
		if app.ApplicantID == newWorkerID {
			selectedApp = app
			found = true
			break
		}
	}
	if !found {
		return errors.New("no se encontró la postulación del usuario")
	}

	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	update := bson.M{
		"$set": bson.M{
			"assignedApplication": selectedApp,
			"status":              jobdomain.JobStatusInProgress, // Se mantiene el estado "in_progress"
			"updatedAt":           time.Now(),
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
// Se agrega el parámetro employerID y se verifica que el documento tenga paymentStatus "completed".
func (j *JobRepository) ProvideEmployerFeedback(jobID, employerID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{
		"_id":    jobID,
		"userId": employerID,                   // Verifica que el campo UserId coincida con employerID
		"status": jobdomain.JobStatusCompleted, // Y que el paymentStatus sea "completed"
	}
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
		return errors.New("job not found or conditions not met")
	}
	return nil
}

// ProvideWorkerFeedback permite que el trabajador deje feedback sobre el empleador.
// Se agrega el parámetro workerID y se verifica que el documento tenga paymentStatus "completed"
// y que el campo assignedTo coincida con workerID.
func (j *JobRepository) ProvideWorkerFeedback(jobID, workerID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{
		"_id":                             jobID,
		"assignedApplication.applicantId": workerID,                     // Verifica que el campo assignedApplication.applicantId coincida con workerID
		"status":                          jobdomain.JobStatusCompleted, // Verifica que el job esté completado
	}
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
		return errors.New("job not found or conditions not met")
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
	ctx := context.Background()
	cacheKey := fmt.Sprintf("job:%s", jobID.Hex())
	var job jobdomain.Job

	// Intentar obtener de Redis
	cachedJob, err := j.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		// Si se encuentra en cache, decodificar el JSON y devolverlo.
		if err := json.Unmarshal([]byte(cachedJob), &job); err == nil {
			return &job, nil
		}
		// Si falla el Unmarshal, se sigue consultando en MongoDB.
	}

	// Consultar MongoDB
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	if err := jobColl.FindOne(ctx, filter).Decode(&job); err != nil {
		return nil, err
	}

	// Serializar y guardar en Redis con expiración de 2 minutos
	if jobBytes, err := json.Marshal(job); err == nil {
		j.redisClient.Set(ctx, cacheKey, jobBytes, 2*time.Minute)
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

// estos es aparte 1
func (j *JobRepository) FindJobsByTagsAndLocation(jobFilter jobdomain.FindJobsByTagsAndLocation) ([]jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Convertir el radio de metros a radianes (radio terrestre ≈ 6,378,100 metros)
	radiusInRadians := jobFilter.RadiusInMeters / 6378100.0

	// Se inicia el filtro vacío
	filter := bson.M{}

	// Si se proporcionan etiquetas, se filtra que al menos una esté presente
	if len(jobFilter.Tags) > 0 {
		filter["tags"] = bson.M{
			"$in": jobFilter.Tags,
		}
	}

	// Filtro por ubicación: trabajos cuyo campo "location" se encuentre dentro del círculo definido
	filter["location"] = bson.M{
		"$geoWithin": bson.M{
			"$centerSphere": []interface{}{
				[]float64{jobFilter.Longitude, jobFilter.Latitude},
				radiusInRadians,
			},
		},
	}

	// Si se proporcionó un título, se agrega un filtro por título (búsqueda por expresión regular, case-insensitive)
	if jobFilter.Title != "" {
		filter["title"] = bson.M{
			"$regex":   jobFilter.Title,
			"$options": "i",
		}
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

func (j *JobRepository) GetJobDetails(jobID, idUser primitive.ObjectID) (*jobdomain.JobDetailsUsers, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	pipeline := mongo.Pipeline{
		// Stage 1: Filtrar por jobID y que el usuario sea el creador o el asignado
		{{
			Key: "$match",
			Value: bson.D{
				{Key: "_id", Value: jobID},
				{Key: "$or", Value: bson.A{
					bson.D{{Key: "userId", Value: idUser}},
					bson.D{{Key: "assignedApplication.applicantId", Value: idUser}},
				}},
			},
		}},
		// Stage 2: Lookup para obtener los detalles del usuario creador
		{{
			Key: "$lookup",
			Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "userId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "userDetails"},
			},
		}},
		// Stage 3: Unwind de userDetails con preserveNullAndEmptyArrays para conservar el documento aun si no hay coincidencia
		{{
			Key: "$unwind",
			Value: bson.D{
				{Key: "path", Value: "$userDetails"},
				{Key: "preserveNullAndEmptyArrays", Value: true},
			},
		}},
		// Stage 4: Lookup para obtener detalles de los postulantes
		{{
			Key: "$lookup",
			Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "applicants.applicantId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "applicantsDetails"},
			},
		}},
		// Stage 5: Mapear el arreglo de postulantes para incluir userData en cada uno
		{{
			Key: "$addFields",
			Value: bson.D{
				{Key: "applicants", Value: bson.D{
					{Key: "$map", Value: bson.D{
						{Key: "input", Value: "$applicants"},
						{Key: "as", Value: "app"},
						{Key: "in", Value: bson.D{
							{Key: "applicantId", Value: "$$app.applicantId"},
							{Key: "proposal", Value: "$$app.proposal"},
							{Key: "price", Value: "$$app.price"},
							{Key: "appliedAt", Value: "$$app.appliedAt"},
							{Key: "userData", Value: bson.D{
								{Key: "$arrayElemAt", Value: bson.A{
									bson.D{
										{Key: "$filter", Value: bson.D{
											{Key: "input", Value: "$applicantsDetails"},
											{Key: "as", Value: "detail"},
											{Key: "cond", Value: bson.D{
												{Key: "$eq", Value: bson.A{"$$detail._id", "$$app.applicantId"}},
											}},
										}},
									},
									0,
								}},
							}},
						}},
					}},
				}},
			},
		}},
		// Stage 6: Lookup para obtener detalles del usuario asignado (si existe)
		{{
			Key: "$lookup",
			Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "assignedApplication.applicantId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "assignedUserDetails"},
			},
		}},
		// Stage 7: Combinar assignedApplication con los datos del usuario asignado
		{{
			Key: "$addFields",
			Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "$cond", Value: bson.D{
						{Key: "if", Value: bson.D{
							// Si el tipo de assignedApplication es "object"
							{Key: "$eq", Value: bson.A{
								bson.D{{Key: "$type", Value: "$assignedApplication"}},
								"object",
							}},
						}},
						{Key: "then", Value: bson.D{
							{Key: "$cond", Value: bson.D{
								// Si hay detalles del usuario asignado (array con tamaño mayor a 0)
								{Key: "if", Value: bson.D{{Key: "$gt", Value: bson.A{
									bson.D{{Key: "$size", Value: "$assignedUserDetails"}},
									0,
								}}}},
								{Key: "then", Value: bson.D{
									{Key: "$mergeObjects", Value: bson.A{
										"$assignedApplication",
										bson.D{{Key: "userData", Value: bson.D{
											{Key: "$arrayElemAt", Value: bson.A{"$assignedUserDetails", 0}},
										}}},
									}},
								}},
								{Key: "else", Value: "$assignedApplication"},
							}},
						}},
						{Key: "else", Value: nil},
					}},
				}},
			},
		}},
	}

	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.JobDetailsUsers
	if err = cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}
	if len(jobs) == 0 {
		return nil, errors.New("job not found")
	}
	return &jobs[0], nil
}

func (j *JobRepository) GetJobDetailvisited(jobID primitive.ObjectID) (*jobdomain.JobDetailsUsers, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	pipeline := mongo.Pipeline{
		// 1. Filtrar el job por _id
		{{
			Key: "$match", Value: bson.D{
				{Key: "_id", Value: jobID},
			},
		}},
		// 2. Lookup para el usuario asignado, usando assignedApplication.applicantId
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "assignedApplication.applicantId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "assignedToArr"},
			},
		}},
		// 3. Extraer el primer elemento de assignedToArr para assignedTo
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "$cond", Value: bson.D{
						{Key: "if", Value: bson.D{
							{Key: "$gt", Value: bson.A{bson.D{{Key: "$size", Value: "$assignedToArr"}}, 0}},
						}},
						{Key: "then", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr", 0}}}},
						{Key: "else", Value: bson.D{}},
					}},
				}},
			},
		}},
		// 4. Lookup para traer los detalles del usuario creador
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "userId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "userDetailsArr"},
			},
		}},
		// 5. Extraer el primer elemento de userDetailsArr para userDetails
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "userDetails", Value: bson.D{
					{Key: "$arrayElemAt", Value: bson.A{"$userDetailsArr", 0}},
				}},
			},
		}},
		// 6. Proyectar únicamente los campos necesarios
		{{
			Key: "$project", Value: bson.D{
				{Key: "applicants.applicantId", Value: 1},
				{Key: "applicants.proposal", Value: 1},
				{Key: "applicants.price", Value: 1},
				{Key: "applicants.appliedAt", Value: 1},
				{Key: "assignedTo._id", Value: 1},
				{Key: "assignedTo.NameUser", Value: 1},
				{Key: "assignedTo.Avatar", Value: 1},
				{Key: "userDetails._id", Value: 1},
				{Key: "userDetails.NameUser", Value: 1},
				{Key: "userDetails.Avatar", Value: 1},
				{Key: "title", Value: 1},
				{Key: "description", Value: 1},
				{Key: "location", Value: 1},
				{Key: "tags", Value: 1},
				{Key: "budget", Value: 1},
				{Key: "finalCost", Value: 1},
				{Key: "status", Value: 1},
				{Key: "createdAt", Value: 1},
				{Key: "updatedAt", Value: 1},
				{Key: "paymentStatus", Value: 1},
				{Key: "paymentAmount", Value: 1},
				{Key: "paymentIntentId", Value: 1},
				{Key: "employerFeedback", Value: 1},
				{Key: "workerFeedback", Value: 1},
			},
		}},
	}

	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobDetails []jobdomain.JobDetailsUsers
	if err := cursor.All(context.Background(), &jobDetails); err != nil {
		return nil, err
	}
	if len(jobDetails) == 0 {
		return nil, errors.New("job not found")
	}

	return &jobDetails[0], nil
}

// obtiene detalles para trabajadores
func (j *JobRepository) GetJobByIDForEmployee(jobID primitive.ObjectID) (*jobdomain.GetJobByIDForEmployee, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	pipeline := mongo.Pipeline{
		// 1. Filtrar el job por _id
		{
			{Key: "$match", Value: bson.D{
				{Key: "_id", Value: jobID},
			}},
		},
		// 2. Lookup: unir la información del usuario usando una sub-pipeline para traer solo _id, nameUser y avatar
		{
			{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				// Definimos una variable "userId" a partir del campo "userId" del job
				{Key: "let", Value: bson.D{
					{Key: "userId", Value: "$userId"},
				}},
				// Pipeline interno del lookup
				{Key: "pipeline", Value: bson.A{
					// Se filtra por el _id del usuario
					bson.D{
						{Key: "$match", Value: bson.D{
							{Key: "$expr", Value: bson.D{
								{Key: "$eq", Value: bson.A{"$_id", "$$userId"}},
							}},
						}},
					},
					// Se proyectan únicamente los campos deseados
					bson.D{
						{Key: "$project", Value: bson.D{
							{Key: "_id", Value: 1},
							{Key: "NameUser", Value: 1},
							{Key: "Avatar", Value: 1},
						}},
					},
				}},
				// Se asigna el resultado al campo "user"
				{Key: "as", Value: "user"},
			}},
		},
		// 3. Convertir el array "user" en un documento (si existe)
		{
			{Key: "$unwind", Value: bson.D{
				{Key: "path", Value: "$user"},
				{Key: "preserveNullAndEmptyArrays", Value: true},
			}},
		},
	}

	cursor, err := jobColl.Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var results []jobdomain.GetJobByIDForEmployee
	if err := cursor.All(context.TODO(), &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, errors.New("job not found")
	}

	return &results[0], nil
}

// Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación
func (j *JobRepository) GetJobsByUserID(userID primitive.ObjectID, page int) ([]jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	var jobs []jobdomain.Job

	// Filtrar por el userId
	filter := bson.M{"userId": userID}

	// Configurar la paginación: 10 trabajos por página, ordenados de más recientes a más viejos
	opts := options.Find().
		SetLimit(10).
		SetSkip(int64((page - 1) * 10)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}

func (j *JobRepository) GetJobsByUserIDForEmploye(userID primitive.ObjectID, page int) ([]jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	limit := int64(10)
	skip := int64((page - 1) * 10)

	pipeline := mongo.Pipeline{
		// Stage 1: Filtrar trabajos cuyo campo "assignedApplication.applicantId" coincida con el usuario
		{{
			Key: "$match", Value: bson.D{
				{Key: "assignedApplication.applicantId", Value: userID},
			},
		}},
		// Stage 2: Lookup para unir la información del usuario creador usando un pipeline
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "let", Value: bson.D{
					{Key: "userId", Value: "$userId"},
				}},
				{Key: "pipeline", Value: bson.A{
					bson.D{{
						Key: "$match", Value: bson.D{
							{Key: "$expr", Value: bson.D{
								{Key: "$eq", Value: bson.A{"$_id", "$$userId"}},
							}},
						},
					}},
					bson.D{{
						Key: "$project", Value: bson.D{
							{Key: "_id", Value: 1},
							{Key: "nameUser", Value: 1},
							{Key: "avatar", Value: 1},
						},
					}},
				}},
				{Key: "as", Value: "user"},
			},
		}},
		// Stage 3: Convertir el array "user" en un documento
		{{
			Key: "$unwind", Value: bson.D{
				{Key: "path", Value: "$user"},
				{Key: "preserveNullAndEmptyArrays", Value: true},
			},
		}},
		// Stage 4: Proyectar para omitir el campo "applicants"
		{{
			Key: "$project", Value: bson.D{
				{Key: "applicants", Value: 0},
			},
		}},
		// Stage 5: Ordenar por "createdAt" descendente
		{{
			Key: "$sort", Value: bson.D{
				{Key: "createdAt", Value: -1},
			},
		}},
		// Stage 6: Paginación: saltar y limitar los resultados
		{{
			Key: "$skip", Value: skip,
		}},
		{{
			Key: "$limit", Value: limit,
		}},
	}

	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	if len(jobs) == 0 {
		return nil, errors.New("no jobs found")
	}

	return jobs, nil
}

// GetAverageRatingForWorker calcula el promedio de calificaciones que un trabajador ha recibido
func (j *JobRepository) GetAverageRatingForWorker(workerID primitive.ObjectID) (float64, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Filtrar por trabajos asignados al trabajador y que estén completados.
	filter := bson.M{
		"assignedApplication.applicantId": workerID,
		"status":                          jobdomain.JobStatusCompleted,
	}

	// Opciones: orden descendente por createdAt y límite de 10 documentos.
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(10)

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return 0, err
	}

	// Calcular el promedio a partir del feedback del empleador.
	var totalRating float64
	var count int
	for _, job := range jobs {
		if job.EmployerFeedback != nil {
			totalRating += float64(job.EmployerFeedback.Rating)
			count++
		}
	}

	if count == 0 {
		return 0, nil // No hay calificaciones disponibles.
	}

	average := totalRating / float64(count)
	return math.Round(average*10) / 10, nil
}

// GetAverageRatingForEmployer calcula el promedio de calificaciones que un empleador ha recibido
func (j *JobRepository) GetAverageRatingForEmployer(employerID primitive.ObjectID) (float64, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	filter := bson.M{
		"userId": employerID,
		"status": jobdomain.JobStatusCompleted,
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(10)

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return 0, err
	}

	var totalRating float64
	var count int
	for _, job := range jobs {
		if job.WorkerFeedback != nil {
			totalRating += float64(job.WorkerFeedback.Rating)
			count++
		}
	}

	if count == 0 {
		return 0, nil
	}

	average := totalRating / float64(count)
	return math.Round(average*10) / 10, nil
}

func (j *JobRepository) GetJobsAssignedCompleted(employerID primitive.ObjectID, page int) ([]jobdomain.JobDetailsUsers, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Filtrar por assignedTo y status completado
	filter := bson.M{
		"assignedApplication.applicantId": employerID,
		"status":                          jobdomain.JobStatusCompleted,
	}
	limit := 10
	skip := (page - 1) * limit

	pipeline := mongo.Pipeline{
		// Stage 1: Filtrado
		{{
			Key: "$match", Value: filter,
		}},
		// Stage 2: Ordenar por createdAt descendente
		{{
			Key: "$sort", Value: bson.D{{Key: "createdAt", Value: -1}},
		}},
		// Stage 3: Paginación
		{{
			Key: "$skip", Value: skip,
		}},
		{{
			Key: "$limit", Value: limit,
		}},
		// Stage 4: Lookup para obtener el usuario asignado
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "assignedTo"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "assignedToArr"},
			},
		}},
		// Stage 5: Extraer el primer elemento de assignedToArr
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr", 0}},
				}},
			},
		}},
		// Stage 6: Lookup para obtener los detalles del usuario creador (userId)
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "userId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "userDetailsArr"},
			},
		}},
		// Stage 7: Extraer el primer elemento de userDetailsArr
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "userDetails", Value: bson.D{
					{Key: "$arrayElemAt", Value: bson.A{"$userDetailsArr", 0}},
				}},
			},
		}},
		// Stage 8: Proyección para limitar los campos
		{{
			Key: "$project", Value: bson.D{
				{Key: "applicants.applicantId", Value: 1},
				{Key: "applicants.NameUser", Value: 1},
				{Key: "applicants.Avatar", Value: 1},
				{Key: "assignedTo._id", Value: 1},
				{Key: "assignedTo.NameUser", Value: 1},
				{Key: "assignedTo.Avatar", Value: 1},
				{Key: "userDetails._id", Value: 1},
				{Key: "userDetails.NameUser", Value: 1},
				{Key: "userDetails.Avatar", Value: 1},
				{Key: "userId", Value: 1},
				{Key: "title", Value: 1},
				{Key: "description", Value: 1},
				{Key: "location", Value: 1},
				{Key: "tags", Value: 1},
				{Key: "budget", Value: 1},
				{Key: "finalCost", Value: 1},
				{Key: "status", Value: 1},
				{Key: "createdAt", Value: 1},
				{Key: "updatedAt", Value: 1},
				{Key: "paymentStatus", Value: 1},
				{Key: "paymentAmount", Value: 1},
				{Key: "paymentIntentId", Value: 1},
				{Key: "employerFeedback", Value: 1},
				{Key: "workerFeedback", Value: 1},
			},
		}},
	}

	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.JobDetailsUsers
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}

func (j *JobRepository) GetJobsAssignedNoCompleted(employerID primitive.ObjectID, page int) ([]jobdomain.JobDetailsUsers, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	filter := bson.M{
		"assignedApplication.applicantId": employerID,
		"status": bson.M{"$in": []string{
			string(jobdomain.JobStatusOpen),
			string(jobdomain.JobStatusInProgress),
		}},
	}
	limit := 10
	skip := (page - 1) * limit

	pipeline := mongo.Pipeline{
		// Stage 1: Filtrado
		{{
			Key: "$match", Value: filter,
		}},
		// Stage 2: Ordenar por createdAt descendente
		{{
			Key: "$sort", Value: bson.D{{Key: "createdAt", Value: -1}},
		}},
		// Stage 3: Paginación
		{{
			Key: "$skip", Value: skip,
		}},
		{{
			Key: "$limit", Value: limit,
		}},
		// Stage 4: Lookup para obtener el usuario asignado
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "assignedTo"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "assignedToArr"},
			},
		}},
		// Stage 5: Extraer el primer elemento de assignedToArr
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr", 0}},
				}},
			},
		}},
		// Stage 6: Lookup para obtener los detalles del usuario creador (userId)
		{{
			Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "userId"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "userDetailsArr"},
			},
		}},
		// Stage 7: Extraer el primer elemento de userDetailsArr
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "userDetails", Value: bson.D{
					{Key: "$arrayElemAt", Value: bson.A{"$userDetailsArr", 0}},
				}},
			},
		}},
		// Stage 8: Proyección para limitar los campos
		{{
			Key: "$project", Value: bson.D{
				{Key: "applicants._id", Value: 1},
				{Key: "applicants.NameUser", Value: 1},
				{Key: "applicants.Avatar", Value: 1},
				{Key: "assignedTo._id", Value: 1},
				{Key: "assignedTo.NameUser", Value: 1},
				{Key: "assignedTo.Avatar", Value: 1},
				{Key: "userDetails._id", Value: 1},
				{Key: "userDetails.NameUser", Value: 1},
				{Key: "userDetails.Avatar", Value: 1},
				{Key: "userId", Value: 1},
				{Key: "title", Value: 1},
				{Key: "description", Value: 1},
				{Key: "location", Value: 1},
				{Key: "tags", Value: 1},
				{Key: "budget", Value: 1},
				{Key: "finalCost", Value: 1},
				{Key: "status", Value: 1},
				{Key: "createdAt", Value: 1},
				{Key: "updatedAt", Value: 1},
				{Key: "paymentStatus", Value: 1},
				{Key: "paymentAmount", Value: 1},
				{Key: "paymentIntentId", Value: 1},
				{Key: "employerFeedback", Value: 1},
				{Key: "workerFeedback", Value: 1},
			},
		}},
	}

	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.JobDetailsUsers
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}
