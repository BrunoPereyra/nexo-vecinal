package jobinfrastructure

import (
	jobdomain "back-end/internal/Job/Job-domain"
	userdomain "back-end/internal/user/user-domain"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
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

	if user.Banned {
		return false, errors.New("estas baneado")
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
	// Si no se encontró la postulación, se crea una con valores por defecto.
	if !found {
		selectedApp = jobdomain.Application{
			ApplicantID: applicantID,
			Proposal:    "usuario asignado de forma forzada", // Valor por defecto; ajusta según convenga.
			Price:       0.0,                                 // Precio por defecto.
			AppliedAt:   time.Now(),
		}
	}

	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{"_id": jobID}
	// Usamos $set para actualizar los campos y $pull para eliminar la postulación asignada
	update := bson.M{
		"$set": bson.M{
			"assignedApplication": selectedApp,
			"status":              jobdomain.JobStatusInProgress,
			"updatedAt":           time.Now(),
		},
		"$pull": bson.M{
			"applicants": bson.M{
				"applicantId": applicantID,
			},
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job no encontrado")
	}

	// Enviar notificación push al trabajador asignado
	if err := j.notifyWorker(selectedApp.ApplicantID, job.Title); err != nil {
		return fmt.Errorf("error sending push notification: %v", err)
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
	// Actualizamos y removemos la postulación asignada
	update := bson.M{
		"$set": bson.M{
			"assignedApplication": selectedApp,
			"status":              jobdomain.JobStatusInProgress,
			"updatedAt":           time.Now(),
		},
		"$pull": bson.M{
			"applicants": bson.M{
				"applicantId": newWorkerID,
			},
		},
	}
	result, err := jobColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("job not found")
	}

	// Enviar notificación push al trabajador reasignado
	if err := j.notifyWorker(selectedApp.ApplicantID, job.Title); err != nil {
		return fmt.Errorf("error sending push notification: %v", err)
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

// ProvideEmployerFeedback permite que el empleador deje feedback sobre el trabajador.
// Se agrega el parámetro employerID y se verifica que el documento tenga paymentStatus "completed".
func (j *JobRepository) ProvideEmployerFeedback(jobID, employerID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	filter := bson.M{
		"_id":    jobID,
		"userId": employerID,                   // Verifica que el campo UserId coincida con employerID
		"status": jobdomain.JobStatusCompleted, // Y que el status sea "completed"
	}

	update := bson.M{
		"$set": bson.M{
			"employerFeedback": feedback,
			"updatedAt":        time.Now(),
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var job struct {
		AssignedApplication *jobdomain.Application `bson:"assignedApplication"`
		Categories          []string               `bson:"tags"`
	}

	// Esta única operación actualiza el documento y lo retorna
	err := jobColl.FindOneAndUpdate(context.Background(), filter, update, opts).Decode(&job)
	if err != nil {
		return errors.New("job not found or conditions not met")
	}

	// Actualizar los usuarios recomendados usando la información obtenida
	fmt.Println(job.AssignedApplication.ApplicantID, job.Categories)
	err = j.UpdateRecommendedUsers(job.AssignedApplication.ApplicantID, job.Categories)

	if err != nil {
		fmt.Println(err)
		return err
	}
	return nil
}

// UpdateRecommendedUsers adds a worker to the recommended users collection
func (j *JobRepository) UpdateRecommendedUsers(workerId primitive.ObjectID, categories []string) error {
	oneMonthAgo := time.Now().AddDate(0, -1, 0)

	// Obtener jobs completados en el último mes para el trabajador
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{
		"assignedApplication.applicantId": workerId,
		"status":                          jobdomain.JobStatusCompleted,
		"updatedAt":                       bson.M{"$gte": oneMonthAgo},
	}

	cursor, err := jobColl.Find(context.Background(), filter, options.Find().SetLimit(4))
	if err != nil {
		return err
	}
	defer cursor.Close(context.Background())

	var totalRatings int
	var totalJobs int
	// Mapa para asegurarnos de contar feedback de cada empleador solo una vez
	// employersCounted := make(map[primitive.ObjectID]bool)

	for cursor.Next(context.Background()) {
		// Incluimos el campo userId para identificar al empleador
		var job struct {
			EmployerFeedback jobdomain.Feedback `bson:"employerFeedback"`
			UserID           primitive.ObjectID `bson:"userId"`
		}
		if err := cursor.Decode(&job); err != nil {
			continue
		}
		// Si ya se contó feedback de este empleador, lo ignoramos
		// if employersCounted[job.UserID] {
		// 	continue
		// }
		// // Se cuenta el feedback de este empleador
		// employersCounted[job.UserID] = true
		totalRatings += job.EmployerFeedback.Rating
		totalJobs++
	}

	// Se requiere mínimo 4 empleadores distintos
	if totalJobs < 4 {
		return nil
	}
	averageRating := float64(totalRatings) / float64(totalJobs)
	if averageRating < 3.0 {
		return nil
	}
	// Actualizar la colección RecommendedUsers
	recommendedUsersColl := j.mongoClient.Database("NEXO-VECINAL").Collection("RecommendedUsers")
	update := bson.M{
		"$set": bson.M{
			"averageRating": averageRating,
			"totalJobs":     totalJobs,
			"updatedAt":     time.Now(),
		},
		"$addToSet": bson.M{
			"tags": bson.M{"$each": categories},
		},
	}
	opts := options.Update().SetUpsert(true)
	_, err = recommendedUsersColl.UpdateOne(context.Background(), bson.M{"workerId": workerId}, update, opts)
	if err != nil {
		fmt.Println(err)

		return err
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

func (j *JobRepository) FindJobsByTagsAndLocation(jobFilter jobdomain.FindJobsByTagsAndLocation) ([]jobdomain.JobDetailsUsers, error) {
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
	// Filtro por ubicación: trabajos dentro del radio especificado
	filter["location"] = bson.M{
		"$geoWithin": bson.M{
			"$centerSphere": []interface{}{
				[]float64{jobFilter.Longitude, jobFilter.Latitude},
				radiusInRadians,
			},
		},
	}

	// Si se proporcionó un título, se filtra por regex (búsqueda flexible)
	if jobFilter.Title != "" {
		filter["title"] = bson.M{
			"$regex":   jobFilter.Title,
			"$options": "i",
		}
	}

	// Definir el pipeline de agregación
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
		// Lookup para obtener detalles del usuario creador
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "Users",
			"localField":   "userId",
			"foreignField": "_id",
			"as":           "userDetails",
		}}},
		// Unwind para extraer el objeto de usuario (si existe)
		bson.D{{Key: "$unwind", Value: bson.M{
			"path":                       "$userDetails",
			"preserveNullAndEmptyArrays": true,
		}}},
	}

	// Ejecutar la consulta agregada
	cursor, err := jobColl.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.JobDetailsUsers
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
func (j *JobRepository) notifyWorker(workerID primitive.ObjectID, jobTitle string) error {
	// Supongamos que tienes una función que obtiene el push token del usuario
	pushToken, err := j.getPushTokenUser(workerID)
	if err != nil {
		return err
	}
	// Construir payload para notificación push de Expo
	payload := map[string]interface{}{
		"to":    pushToken,
		"title": "Trabajo asignado",
		"body":  fmt.Sprintf("Has sido asignado al trabajo '%s'", jobTitle),
		"data":  map[string]string{"jobTitle": jobTitle},
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	// Enviar la notificación push
	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("error enviando notificación, status: %d", resp.StatusCode)
	}
	return nil
}
func (j *JobRepository) getPushTokenUser(workerID primitive.ObjectID) (string, error) {
	userColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var user struct {
		PushToken string `bson:"pushToken"`
	}
	filter := bson.M{"_id": workerID}
	err := userColl.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return "", err
	}
	if user.PushToken == "" {
		return "", errors.New("el trabajador no tiene push token")
	}
	return user.PushToken, nil
}
func (j *JobRepository) GetJobDetailChat(jobID primitive.ObjectID) (*jobdomain.JobDetailsUsers, error) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("jobDetailChat:%s", jobID.Hex())

	// Intentar obtener el resultado de Redis
	cached, err := j.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedDetail jobdomain.JobDetailsUsers
		if err := json.Unmarshal([]byte(cached), &cachedDetail); err == nil {
			return &cachedDetail, nil
		}
		// Si ocurre error al deserializar, se continúa y se obtiene de la BD.
	} else if err != redis.Nil {
		// Si ocurre otro error, se puede loguear y continuar.
		fmt.Printf("Error obteniendo cache: %v\n", err)
	}

	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Pipeline de agregación para traer solo los campos necesarios para el chat, incluyendo la información completa del usuario asignado (userData)
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
		// 3. Extraer los campos mínimos del usuario asignado y además incluir toda su data en "userData"
		{{
			Key: "$addFields", Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "applicantId", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr._id", 0}}}},
					{Key: "NameUser", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr.NameUser", 0}}}},
					{Key: "Avatar", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr.Avatar", 0}}}},
					// Se agrega el objeto completo como userData
					{Key: "userData", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr", 0}}}},
				}},
			},
		}},
		// 4. Lookup para traer los detalles del creador (empleador)
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
		// 6. Proyectar únicamente los campos necesarios para el chat
		{{
			Key: "$project", Value: bson.D{
				{Key: "_id", Value: 1},
				{Key: "userId", Value: 1},
				{Key: "status", Value: 1},
				{Key: "assignedTo.applicantId", Value: 1},
				{Key: "assignedTo.NameUser", Value: 1},
				{Key: "assignedTo.Avatar", Value: 1},
				{Key: "assignedTo.userData", Value: 1},
				{Key: "userDetails._id", Value: 1},
				{Key: "userDetails.NameUser", Value: 1},
				{Key: "userDetails.Avatar", Value: 1},
			},
		}},
	}

	cursor, err := jobColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var jobDetails []jobdomain.JobDetailsUsers
	if err := cursor.All(ctx, &jobDetails); err != nil {
		return nil, err
	}
	if len(jobDetails) == 0 {
		return nil, errors.New("job not found")
	}

	result := &jobDetails[0]

	// Serializar el resultado a JSON para almacenarlo en Redis
	resultJSON, err := json.Marshal(result)
	if err == nil {
		// Guardar en Redis con expiración de 2 minutos
		j.redisClient.Set(ctx, cacheKey, resultJSON, 2*time.Minute)
	} else {
		fmt.Printf("Error serializando el resultado: %v\n", err)
	}

	return result, nil
}

func (r *JobRepository) GetRecommendedUsers(categories []string, page, limit int) ([]jobdomain.User, error) {
	recommendedColl := r.mongoClient.Database("NEXO-VECINAL").Collection("RecommendedUsers")

	var pipeline mongo.Pipeline

	// Si se proporcionaron categorías, filtrar los documentos cuya propiedad "categories" contenga al menos una.
	if len(categories) > 0 {
		pipeline = append(pipeline, bson.D{
			{Key: "$match", Value: bson.M{"tags": bson.M{"$in": categories}}},
		})
	}

	// Agregar paginación.
	skip := (page - 1) * limit
	pipeline = append(pipeline,
		bson.D{{Key: "$skip", Value: skip}},
		bson.D{{Key: "$limit", Value: limit}},
	)

	// Realizar un $lookup para unir con la colección "Users"
	pipeline = append(pipeline, bson.D{
		{Key: "$lookup", Value: bson.M{
			"from":         "Users",
			"localField":   "workerId",
			"foreignField": "_id",
			"as":           "userInfo",
		}},
	})

	// Deshacer el arreglo resultante
	pipeline = append(pipeline, bson.D{{Key: "$unwind", Value: "$userInfo"}})

	// Proyectar solo los campos requeridos.
	pipeline = append(pipeline, bson.D{
		{Key: "$project", Value: bson.M{
			"_id":      "$userInfo._id",
			"NameUser": "$userInfo.NameUser",
			"Avatar":   "$userInfo.Avatar",
		}},
	})

	ctx := context.Background()
	cursor, err := recommendedColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("error executing aggregation: %v", err)
	}

	var users []jobdomain.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, fmt.Errorf("error decoding recommended users: %v", err)
	}
	fmt.Println(users)
	return users, nil
}
