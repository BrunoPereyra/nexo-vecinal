package reportsroutes

import (
	"back-end/internal/reports/reportsapplication"
	"back-end/internal/reports/reportsinterfaces"
	reportsinfrastructure "back-end/internal/reports/reportsnfrastructure"

	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

// AdminReportRoutes configura los endpoints para reportes y bloqueo.
func AdminReportRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	// Se crea el repositorio de reportes (no se necesita Redis para estos endpoints)
	reportRepo := reportsinfrastructure.NewReportRepository(mongoClient)
	reportService := reportsapplication.NewReportService(reportRepo)
	reportHandler := reportsinterfaces.NewReportHandler(reportService)

	adminGroup := app.Group("/reports")
	// reports
	adminGroup.Post("/reports", middleware.UseExtractor(), reportHandler.CreateReport) // Crear reporte

}
