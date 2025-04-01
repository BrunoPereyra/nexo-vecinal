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

	App.Post("/post/create", middleware.UseExtractor(), PostHandler.CreatePost)
	App.Put("/post/:postId/like", middleware.UseExtractor(), PostHandler.AddLike)
	App.Put("/post/:postId/dislike", middleware.UseExtractor(), PostHandler.AddDislike)
	App.Post("/post/:postId/comment", middleware.UseExtractor(), PostHandler.AddComment)
	App.Get("/post/latest", middleware.UseExtractor(), PostHandler.GetLatestPosts)
	App.Get("/post/:postId/getPostId", middleware.UseExtractor(), PostHandler.GetPostByID)
	App.Get("/post/:postId/comments", middleware.UseExtractor(), PostHandler.GetCommentsForPost)
}
