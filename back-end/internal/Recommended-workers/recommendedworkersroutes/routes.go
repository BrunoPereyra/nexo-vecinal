package recommendedworkersroutes

import (
	recommendedworkersapplication "back-end/internal/Recommended-workers/RecommendedWorkers-application"
	recommendedworkersinfrastructure "back-end/internal/Recommended-workers/RecommendedWorkers-infrastructure"
	recommendedworkersinterfaces "back-end/internal/Recommended-workers/RecommendedWorkers-interfaces"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

func RecommendedWorkersRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	repo := recommendedworkersinfrastructure.NewRecommendedWorkersRepository(redisClient, mongoClient)
	service := recommendedworkersapplication.NewRecommendedWorkersService(repo)
	handler := recommendedworkersinterfaces.NewRecommendedWorkersHandler(service)

	app.Get("/workers/recommended", handler.GetRecommendedUsersHandler)

}
