package cursosroutes

import (
	"back-end/internal/cursos/cursosapplication"
	cursosinfrastructure "back-end/internal/cursos/cursosinfrastructura"
	"back-end/internal/cursos/cursosinterfaces"
	userinfrastructure "back-end/internal/user/user-infrastructure"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserRepository se debe implementar en otra parte de tu aplicación y pasarse aquí.

// CursoRoutes configura los endpoints para gestionar cursos.
func CursoRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	userRepo := userinfrastructure.NewUserRepository(redisClient, mongoClient)
	// Se crea el repositorio, servicio y handler de cursos.
	cursoRepo := cursosinfrastructure.NewCursoRepository(mongoClient)
	cursoService := cursosapplication.NewCursoService(cursoRepo)
	cursoHandler := cursosinterfaces.NewCursoHandler(cursoService, userRepo)

	cursosGroup := app.Group("/cursos")
	cursosGroup.Post("/", middleware.UseExtractor(), cursoHandler.CreateCurso) // Crear curso
	cursosGroup.Get("/paginated", cursoHandler.GetCursosPaginated)             // Obtener cursos paginados
	cursosGroup.Get("/active", cursoHandler.GetActiveCursos)                   // Obtener cursos con campaña activa
}
