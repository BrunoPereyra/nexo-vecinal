package recommendedworkersinfrastructure

import (
	jobdomain "back-end/internal/Job/Job-domain"
	recommendedworkersdomain "back-end/internal/Recommended-workers/RecommendedWorkers-domain"
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type RecommendedWorkersRepository struct {
	redisClient *redis.Client
	mongoClient *mongo.Client
}

func NewRecommendedWorkersRepository(redisClient *redis.Client, mongoClient *mongo.Client) *RecommendedWorkersRepository {
	return &RecommendedWorkersRepository{
		redisClient: redisClient,
		mongoClient: mongoClient,
	}
}
func (r *RecommendedWorkersRepository) GetRecommendedWorkers(req recommendedworkersdomain.GetWorkers) ([]jobdomain.User, error) {
	recommendedColl := r.mongoClient.Database("NEXO-VECINAL").Collection("RecommendedWorkers")

	now := time.Now()
	oneMonthAgo := now.AddDate(0, -1, 0)

	// Parámetros del request
	categories := req.Categories
	GeoPoint := req.GeoPoint
	page := req.Page
	limit := req.Limit
	maxDistance := req.MaxDistance

	// Filtro base
	filter := bson.M{
		"$or": []bson.M{
			{"oldestFeedback": bson.M{"$gte": oneMonthAgo}},
			{"premium.SubscriptionEnd": bson.M{"$gt": now}},
		},
	}

	// Filtro por tags si hay
	if len(categories) > 0 {
		filter["tags"] = bson.M{"$in": categories}
	}

	// Agregar filtro geográfico (usando centerSphere en lugar de $geoNear)
	radiusInRadians := float64(maxDistance) / 6371000.0 // Radio de la Tierra en metros
	filter["geoPoint"] = bson.M{
		"$geoWithin": bson.M{
			"$centerSphere": []interface{}{
				GeoPoint.Coordinates,
				radiusInRadians,
			},
		},
	}

	// Construcción del pipeline
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$skip", Value: (page - 1) * limit}},
		{{Key: "$limit", Value: limit}},
		{{
			Key: "$lookup", Value: bson.M{
				"from":         "Users",
				"localField":   "workerId",
				"foreignField": "_id",
				"as":           "userInfo",
			},
		}},
		{{Key: "$unwind", Value: "$userInfo"}},
		{{
			Key: "$project", Value: bson.M{
				"_id":      "$userInfo._id",
				"NameUser": "$userInfo.NameUser",
				"Avatar":   "$userInfo.Avatar",
			},
		}},
	}

	ctx := context.Background()
	cursor, err := recommendedColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("error executing aggregation: %v", err)
	}

	var users []jobdomain.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, fmt.Errorf("error decoding recommended workers: %v", err)
	}

	return users, nil
}
