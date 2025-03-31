package postroutes

import (
	"back-end/internal/posts/postapplication"
	"back-end/internal/posts/postinfrastructure"
	"back-end/internal/posts/postinterfaces"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

func PostRoutes(App *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	PostRepository := postinfrastructure.NewPostRepository(redisClient, mongoClient)
	PostService := postapplication.NewPostService(PostRepository)
	PostHandler := postinterfaces.NewPostHandler(PostService, mongoClient)

	// Crear un nuevo post (con hasta 3 imágenes)
	App.Post("/post/create", middleware.UseExtractor(), PostHandler.CreatePost)
	// Agregar like
	App.Put("/post/:postId/like", middleware.UseExtractor(), PostHandler.AddLike)
	// Agregar dislike
	App.Put("/post/:postId/dislike", middleware.UseExtractor(), PostHandler.AddDislike)
	// Agregar comentario
	App.Post("/post/:postId/comment", middleware.UseExtractor(), PostHandler.AddComment)
	// Obtener últimos posts (con datos del creador)
	App.Get("/post/latest", middleware.UseExtractor(), PostHandler.GetLatestPosts)
	App.Get("/post/:postId/getPostId", middleware.UseExtractor(), PostHandler.GetPostByID)

}
