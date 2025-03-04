package main

import (
	"back-end/config"
	jobroutes "back-end/internal/Job/Job-routes"
	"back-end/internal/admin/adminroutes"
	"back-end/internal/chat/chatroutes"
	"back-end/internal/cursos/cursosroutes"
	supportroutes "back-end/internal/support/support_routes"
	userroutes "back-end/internal/user/user-routes"
	"time"

	"context"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	redisClient := setupRedisClient()
	newMongoDB := setupMongoDB()
	// defer redisClient.Close()
	defer newMongoDB.Disconnect(context.Background())

	app := fiber.New(fiber.Config{
		BodyLimit: 200 * 1024 * 1024,
	})
	app.Use(cors.New(
	// cors.Config{
	// 	AllowCredentials: true,
	// 	AllowOrigins:     "https://www.pinkker.tv,https://pinkker.tv",
	// 	AllowHeaders:     "Origin, Content-Type, Accept, Accept-Language, Content-Length",
	// 	AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
	// },
	))

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return c.Status(fiber.StatusUpgradeRequired).SendString("Upgrade required")
	})
	// users
	userroutes.UserRoutes(app, redisClient, newMongoDB)
	jobroutes.JobRoutes(app, redisClient, newMongoDB)
	adminroutes.AdminReportRoutes(app, redisClient, newMongoDB)
	chatroutes.ChatRoutes(app, redisClient, newMongoDB)
	cursosroutes.CursoRoutes(app, redisClient, newMongoDB)
	supportroutes.SupportRoutes(app, redisClient, newMongoDB)
	PORT := config.PORT()
	if PORT == "" {
		PORT = "8081"
	}
	log.Fatal(app.Listen(":" + PORT))
}

func setupRedisClient() *redis.Client {
	PasswordRedis := config.PASSWORDREDIS()
	ADDRREDIS := config.ADDRREDIS()
	client := redis.NewClient(&redis.Options{
		Addr:     ADDRREDIS,
		Password: PasswordRedis,
		DB:       0,
	})

	_, err := client.Ping(context.Background()).Result()
	if err != nil {
		log.Fatalf("Error al conectar con Redis: %s", err.Error())
	}
	fmt.Println("Redis connect")
	return client
}
func setupMongoDB() *mongo.Client {
	URI := config.MONGODB_URI()
	if URI == "" {
		log.Fatal("MONGODB_URI no está configurado")
	}

	clientOptions := options.Client().
		ApplyURI(URI).
		SetMaxPoolSize(100).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(30 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.NewClient(clientOptions)
	if err != nil {
		log.Fatalf("Error al crear el cliente de MongoDB: %v", err)
	}

	if err = client.Connect(ctx); err != nil {
		log.Fatalf("Error al conectar a MongoDB: %v", err)
	}

	if err = client.Ping(ctx, nil); err != nil {
		log.Fatalf("Error al hacer ping a MongoDB: %v", err)
	}

	fmt.Println("Conexión a MongoDB establecida")
	return client
}
