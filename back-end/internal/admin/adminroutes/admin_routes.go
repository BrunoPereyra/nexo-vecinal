package adminroutes

import (
	"back-end/internal/admin/adminapplication"
	"back-end/internal/admin/admininfrastructure"
	"back-end/internal/admin/admininterfaces"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

// AdminReportRoutes configura los endpoints para reportes y bloqueo.
func AdminReportRoutes(app *fiber.App, redisClient *redis.Client, mongoClient *mongo.Client) {
	// Se crea el repositorio de reportes (no se necesita Redis para estos endpoints)
	reportRepo := admininfrastructure.NewReportRepository(mongoClient)
	reportService := adminapplication.NewReportService(reportRepo)
	reportHandler := admininterfaces.NewReportHandler(reportService)

	adminGroup := app.Group("/admin")
	adminGroup.Post("/reports", middleware.UseExtractor(), reportHandler.CreateReport) // Crear reporte
	adminGroup.Get("/reports/:id", reportHandler.GetReportById)                        // Obtener reporte por ID
	adminGroup.Get("/reports", reportHandler.GetReportsByUser)                         // Obtener reportes por usuario (query params)
	adminGroup.Get("/reports/global", reportHandler.GetGlobalReports)                  // Obtener reportes globales
	adminGroup.Post("/reports/:id/read", reportHandler.MarkReportAsRead)               // Marcar reporte como leído
	adminGroup.Post("/block", reportHandler.BlockUser)                                 // Bloquear usuario (requiere autorización de admin)
}
