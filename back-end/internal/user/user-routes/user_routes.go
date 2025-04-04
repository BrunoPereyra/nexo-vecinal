package userroutes

import (
	application "back-end/internal/user/user-application"
	infrastructure "back-end/internal/user/user-infrastructure"
	interfaces "back-end/internal/user/user-interfaces"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

func UserRoutes(App *fiber.App, redisClient *redis.Client, newMongoDB *mongo.Client) {

	userRepository := infrastructure.NewUserRepository(redisClient, newMongoDB)
	userService := application.NewChatService(userRepository)
	UserHandler := interfaces.NewUserHandler(userService)

	App.Post("/user/signupNotConfirmed", UserHandler.SignupSaveUserRedis)
	App.Post("/user/SaveUserCodeConfirm", UserHandler.SaveUserCodeConfirm)
	App.Post("/user/login", UserHandler.Login)
	App.Post("/user/save-push-token", middleware.UseExtractor(), UserHandler.SavePushToken)

	// oauth2
	App.Get("/user/google_login", UserHandler.GoogleLogin)
	App.Get("/user/google_callback", UserHandler.Google_callback)
	App.Post("/user/Google_callback_Complete_Profile_And_Username", UserHandler.Google_callback_Complete_Profile_And_Username)

	// doble auth
	App.Post("/user/LoginTOTPSecret", UserHandler.LoginTOTPSecret)
	App.Post("/generate-totp-key", middleware.UseExtractor(), UserHandler.GenerateTOTPKey)
	App.Post("/validate-totp-code", middleware.UseExtractor(), UserHandler.ValidateTOTPCode)
	App.Get("/user/get-user-token", middleware.UseExtractor(), UserHandler.GetUserByIdTheToken)
	App.Get("/user/get-user-by-id", UserHandler.GetUserById)

	// edit user
	App.Post("/user/edit-biografia", middleware.UseExtractor(), UserHandler.UpdateUserBiography)
	App.Post("/user/EditAvatar", middleware.UseExtractor(), UserHandler.EditAvatar)
	App.Post("/user/save-location-tags", middleware.UseExtractor(), UserHandler.SaveLocationTags)
	App.Post("/user/get-users-prime-ratiosTags", middleware.UseExtractor(), UserHandler.GetFilteredUsers)
}
