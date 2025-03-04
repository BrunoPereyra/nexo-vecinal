package cursosinfrastructure

import (
	cursosdomain "back-end/internal/cursos/cursosfomain"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CursoRepository se encarga del acceso a datos para los cursos.
type CursoRepository struct {
	mongoClient *mongo.Client
}

// NewCursoRepository crea una nueva instancia de CursoRepository.
func NewCursoRepository(mongoClient *mongo.Client) *CursoRepository {
	return &CursoRepository{
		mongoClient: mongoClient,
	}
}

// CreateCurso inserta un nuevo curso en la base de datos.
func (r *CursoRepository) CreateCurso(curso cursosdomain.Curso) error {
	collection := r.mongoClient.Database("NEXO-VECINA").Collection("cursos")
	_, err := collection.InsertOne(context.Background(), curso)
	return err
}

// GetCursosPaginated obtiene los cursos de manera paginada y ordenada por CampaignEnd (descendente).
func (r *CursoRepository) GetCursosPaginated(page, limit int) ([]cursosdomain.Curso, error) {
	collection := r.mongoClient.Database("NEXO-VECINA").Collection("cursos")
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "campaignEnd", Value: -1}})
	findOptions.SetSkip(int64((page - 1) * limit))
	findOptions.SetLimit(int64(limit))
	cursor, err := collection.Find(context.Background(), bson.M{}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var cursos []cursosdomain.Curso
	for cursor.Next(context.Background()) {
		var curso cursosdomain.Curso
		if err := cursor.Decode(&curso); err != nil {
			return nil, err
		}
		cursos = append(cursos, curso)
	}
	return cursos, cursor.Err()
}

// GetActiveCursos obtiene los cursos cuya campaña aún no terminó.
func (r *CursoRepository) GetActiveCursos() ([]cursosdomain.Curso, error) {
	collection := r.mongoClient.Database("NEXO-VECINA").Collection("cursos")
	now := time.Now()
	cursor, err := collection.Find(context.Background(), bson.M{"campaignEnd": bson.M{"$gt": now}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var cursos []cursosdomain.Curso
	for cursor.Next(context.Background()) {
		var curso cursosdomain.Curso
		if err := cursor.Decode(&curso); err != nil {
			return nil, err
		}
		cursos = append(cursos, curso)
	}
	return cursos, cursor.Err()
}

// GetCursoByID obtiene un curso por su ID.
func (r *CursoRepository) GetCursoByID(id primitive.ObjectID) (cursosdomain.Curso, error) {
	collection := r.mongoClient.Database("NEXO-VECINA").Collection("cursos")
	var curso cursosdomain.Curso
	err := collection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&curso)
	return curso, err
}
