// supportroutes/support_routes.go
package supportroutes

import (
	"back-end/internal/support/supportapplication"
	"back-end/internal/support/supportinfrastructure"
	"back-end/internal/support/supportinterfaces"
	userinfrastructure "back-end/internal/user/user-infrastructure"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

// SupportRoutes configura las rutas del módulo de chat de soporte.
func SupportRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	supportRepo := supportinfrastructure.NewSupportRepository(mongoClient, redisClient)
	userRepo := userinfrastructure.NewUserRepository(nil, mongoClient)
	supportService := supportapplication.NewSupportService(supportRepo, userRepo)
	supportHandler := supportinterfaces.NewSupportHandler(supportService)

	supportGroup := app.Group("/support")
	supportGroup.Post("/messages", middleware.UseExtractor(), supportHandler.SendSupportMessage)
	supportGroup.Get("/messages", middleware.UseExtractor(), supportHandler.GetSupportMessages)
	supportGroup.Post("/messages/:id/read", middleware.UseExtractor(), supportHandler.MarkSupportMessageAsRead)
	supportGroup.Get("/GetSupportAgent", middleware.UseExtractor(), supportHandler.GetSupportAgent)
	supportGroup.Get("/conversations", middleware.UseExtractor(), supportHandler.GetConversationsForSupport)

	// room = fmt.Sprintf("support:conversation:%s", senderID.Hex()+receiverID.Hex()) send = soporte
	supportGroup.Get("/subscribe/:supportID", websocket.New(supportHandler.SubscribeSupportMessages))

}
