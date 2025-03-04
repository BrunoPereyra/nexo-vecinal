package chatroutes

import (
	jobinfrastructure "back-end/internal/Job/Job-infrastructure"
	"back-end/internal/chat/chatapplication"
	"back-end/internal/chat/chatinfrastructure"
	"back-end/internal/chat/chatinterfaces"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

func ChatRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	chatRepo := chatinfrastructure.NewChatRepository(mongoClient, redisClient)
	// Se inyecta el repositorio de trabajos para validar condiciones en el chat.
	jobRepo := jobinfrastructure.NewjobRepository(redisClient, mongoClient)
	chatService := chatapplication.NewChatService(chatRepo, jobRepo)
	chatHandler := chatinterfaces.NewChatHandler(chatService)

	chatGroup := app.Group("/chat")
	chatGroup.Post("/messages", middleware.UseExtractor(), chatHandler.SendMessage)
	chatGroup.Get("/messages", middleware.UseExtractor(), chatHandler.GetMessagesBetween)
	chatGroup.Post("/messages/:id/read", middleware.UseExtractor(), chatHandler.MarkMessageAsRead)
	// Nueva ruta para suscripción vía WebSocket
	chatGroup.Get("/subscribe/:jobID", middleware.UseExtractor(), websocket.New(chatHandler.SubscribeMessages))
}
