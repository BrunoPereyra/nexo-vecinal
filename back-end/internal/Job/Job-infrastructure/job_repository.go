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

	if user.CompletedJobs >= 20 && !isPrimeActive {
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
// Se agrega el parámetro employerID y se verifica que el documento tenga paymentStatus "completed".
func (j *JobRepository) ProvideEmployerFeedback(jobID, employerID primitive.ObjectID, feedback jobdomain.Feedback) error {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")
	filter := bson.M{
		"_id":    jobID,
		"UserId": employerID,                   // Verifica que el campo UserId coincida con employerID
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
		"_id":        jobID,
		"assignedTo": workerID,                     // Verifica que el campo assignedTo coincida con workerID
		"status":     jobdomain.JobStatusCompleted, // Y que el paymentStatus sea "completed"
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

	// Definir el pipeline de agregación
	pipeline := mongo.Pipeline{
		// 1. $match: Filtrar el job por _id y userId
		{
			{Key: "$match", Value: bson.D{
				{Key: "_id", Value: jobID},
				{Key: "userId", Value: idUser},
			}},
		},
		// 2. $lookup: Traer los datos de los postulantes (Applicants) desde la colección Users
		{
			{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "applicants"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "applicants"},
			}},
		},
		// 3. $lookup: Traer el usuario asignado (AssignedTo) desde la colección Users
		{
			{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "Users"},
				{Key: "localField", Value: "assignedTo"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "assignedToArr"},
			}},
		},
		// 4. $addFields: Extraer el primer elemento de assignedToArr si existe; de lo contrario, devolver un objeto vacío
		{
			{Key: "$addFields", Value: bson.D{
				{Key: "assignedTo", Value: bson.D{
					{Key: "$cond", Value: bson.D{
						{Key: "if", Value: bson.D{
							{Key: "$gt", Value: bson.A{
								bson.D{{Key: "$size", Value: "$assignedToArr"}}, 0,
							}},
						}},
						{Key: "then", Value: bson.D{
							{Key: "$arrayElemAt", Value: bson.A{"$assignedToArr", 0}},
						}},
						{Key: "else", Value: bson.D{}},
					}},
				}},
			}},
		},
		// 5. $project: Seleccionar únicamente los campos necesarios
		{
			{Key: "$project", Value: bson.D{
				// Para los postulantes: solo _id, NameUser y Avatar
				{Key: "applicants._id", Value: 1},
				{Key: "applicants.NameUser", Value: 1},
				{Key: "applicants.Avatar", Value: 1},
				// Para el usuario asignado: solo _id, NameUser y Avatar
				{Key: "assignedTo._id", Value: 1},
				{Key: "assignedTo.NameUser", Value: 1},
				{Key: "assignedTo.Avatar", Value: 1},
				// Otros campos del job
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
			}},
		},
	}

	// Ejecutar la agregación
	cursor, err := jobColl.Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	// Decodificar el resultado en el struct JobDetailsUsers
	var jobDetails []jobdomain.JobDetailsUsers
	if err := cursor.All(context.TODO(), &jobDetails); err != nil {
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

	// Configurar la paginación y el orden: 10 trabajos por página, ordenados de más recientes a más viejos
	opts := options.Find().
		SetLimit(10).
		SetSkip(int64((page - 1) * 10)).
		SetSort(bson.D{{"createdAt", -1}})

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
		// 1. Filtrar los trabajos cuyo campo "userId" coincida con el usuario
		{{Key: "$match", Value: bson.D{
			{Key: "userId", Value: userID},
		}}},
		// 2. Lookup: unir la información del usuario (el creador del job) usando la variable "userId"
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Users"},
			{Key: "let", Value: bson.D{
				{Key: "userId", Value: "$userId"},
			}},
			{Key: "pipeline", Value: bson.A{
				bson.D{
					{Key: "$match", Value: bson.D{
						{Key: "$expr", Value: bson.D{
							{Key: "$eq", Value: bson.A{"$_id", "$$userId"}},
						}},
					}},
				},
				bson.D{
					{Key: "$project", Value: bson.D{
						{Key: "_id", Value: 1},
						{Key: "nameUser", Value: 1},
						{Key: "avatar", Value: 1},
					}},
				},
			}},
			{Key: "as", Value: "user"},
		}}},
		// 3. Convertir el array "user" en un documento
		{{Key: "$unwind", Value: bson.D{
			{Key: "path", Value: "$user"},
			{Key: "preserveNullAndEmptyArrays", Value: true},
		}}},
		// 4. Proyectar para omitir el campo "Applicants"
		{{Key: "$project", Value: bson.D{
			{Key: "Applicants", Value: 0},
		}}},
		// 5. Ordenar por "createdAt" de forma descendente (más recientes primero)
		{{Key: "$sort", Value: bson.D{
			{Key: "createdAt", Value: -1},
		}}},
		// 6. Paginación: saltar y limitar los resultados
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
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
// en los últimos 10 trabajos completados.
func (j *JobRepository) GetAverageRatingForWorker(workerID primitive.ObjectID) (float64, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Filtramos por trabajos asignados al trabajador y que estén completados.
	filter := bson.M{
		"assignedTo": workerID,
		"status":     jobdomain.JobStatusCompleted, // Y que el paymentStatus sea "completed"

	}

	// Opciones: orden descendente por createdAt y límite de 10 documentos.
	opts := options.Find().SetSort(bson.D{{"createdAt", -1}}).SetLimit(10)

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return 0, err
	}

	// Calculamos el promedio de estrellas a partir del feedback del empleador.
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

	avgRating := totalRating / float64(count)
	return avgRating, nil
}

// GetAverageRatingForEmployer calcula el promedio de calificaciones que un empleador ha recibido
// en los últimos 10 trabajos completados.
func (j *JobRepository) GetAverageRatingForEmployer(employerID primitive.ObjectID) (float64, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Filtramos por trabajos creados por el empleador y que estén completados.
	filter := bson.M{
		"userId": employerID,
		"status": jobdomain.JobStatusCompleted, // Y que el paymentStatus sea "completed"
	}

	// Opciones: orden descendente por createdAt y límite de 10 documentos.
	opts := options.Find().SetSort(bson.D{{"createdAt", -1}}).SetLimit(10)

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return 0, err
	}

	// Calculamos el promedio de estrellas a partir del feedback del trabajador.
	var totalRating float64
	var count int
	for _, job := range jobs {
		if job.WorkerFeedback != nil {
			totalRating += float64(job.WorkerFeedback.Rating)
			count++
		}
	}

	if count == 0 {
		return 0, nil // No hay calificaciones disponibles.
	}

	avgRating := totalRating / float64(count)
	return avgRating, nil
}
func (j *JobRepository) GetJobsAssignedNoCompleted(employerID primitive.ObjectID) ([]jobdomain.Job, error) {
	jobColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Job")

	// Filtramos por jobs asignados cuyo paymentStatus esté en ["open", "in_progress"]
	filter := bson.M{
		"assignedTo": employerID,
		"status":     bson.M{"$in": []string{string(jobdomain.JobStatusOpen), string(jobdomain.JobStatusInProgress)}},
	}

	// Opciones: orden descendente por createdAt y límite de 10 documentos.
	opts := options.Find().SetSort(bson.D{{"createdAt", -1}}).SetLimit(10)

	cursor, err := jobColl.Find(context.Background(), filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var jobs []jobdomain.Job
	if err := cursor.All(context.Background(), &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}
