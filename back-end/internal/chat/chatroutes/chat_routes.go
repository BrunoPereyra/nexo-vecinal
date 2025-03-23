// package chatroutes
package chatroutes

import (
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
	chatService := chatapplication.NewChatService(chatRepo)
	chatHandler := chatinterfaces.NewChatHandler(chatService)

	chatGroup := app.Group("/chat")
	chatGroup.Get("/room", middleware.UseExtractor(), chatHandler.GetChatRoom)
	chatGroup.Post("/messages", middleware.UseExtractor(), chatHandler.SendMessage)
	chatGroup.Get("/messages", middleware.UseExtractor(), chatHandler.GetMessagesBetween)
	chatGroup.Post("/messages/:id/read", middleware.UseExtractor(), chatHandler.MarkMessageAsRead)
	chatGroup.Get("/subscribe/:chatRoomId", websocket.New(chatHandler.SubscribeMessages))
	chatGroup.Post("/block", middleware.UseExtractor(), chatHandler.BlockChat)
	chatGroup.Get("/rooms", middleware.UseExtractor(), chatHandler.GetChatRooms)

}
