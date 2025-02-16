// internal/chat/chatroutes/chat_routes.go
package chatroutes

import (
	jobinfrastructure "back-end/internal/Job/Job-infrastructure"
	"back-end/internal/chat/chatapplication"
	"back-end/internal/chat/chatinfrastructure"
	"back-end/internal/chat/chatinterfaces"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/mongo"
)

func ChatRoutes(app *fiber.App, mongoClient *mongo.Client) {
	chatRepo := chatinfrastructure.NewChatRepository(mongoClient)
	// Se inyecta el repositorio de trabajos para validar condiciones en el chat.
	jobRepo := jobinfrastructure.NewjobRepository(nil, mongoClient)
	chatService := chatapplication.NewChatService(chatRepo, jobRepo)
	chatHandler := chatinterfaces.NewChatHandler(chatService)

	chatGroup := app.Group("/chat")
	chatGroup.Post("/messages", chatHandler.SendMessage)
	chatGroup.Get("/messages", chatHandler.GetMessagesBetween)
	chatGroup.Post("/messages/:id/read", chatHandler.MarkMessageAsRead)
}
