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
	reportsGroup := app.Group("/reports")

	// reports
	reportsGroup.Post("/reports", middleware.UseExtractor(), reportHandler.CreateReport)                      // Crear reporte a usuario
	reportsGroup.Post("/reportContent", middleware.UseExtractor(), reportHandler.CreateOrUpdateContentReport) // Crear reporte

	reportsGroup.Get("/GetContentReports", middleware.UseExtractor(), reportHandler.GetContentReports)

	// admin
	adminGroup.Get("/reports/getid/:id", reportHandler.GetReportById)    // Obtener reporte por ID
	adminGroup.Get("/reports", reportHandler.GetReportsByUser)           // Obtener reportes por usuario (query params)
	adminGroup.Get("/reports/global", reportHandler.GetGlobalReports)    // Obtener reportes globales
	adminGroup.Post("/reports/:id/read", reportHandler.MarkReportAsRead) // Marcar reporte como leído
	adminGroup.Post("/block", reportHandler.BlockUser)                   // Bloquear usuario (requiere autorización de admin)

	adminGroup.Delete("/deleteJob", middleware.UseExtractor(), reportHandler.DeleteJob)                     // delete job(requiere autorización de admin)
	adminGroup.Delete("/deletePost", middleware.UseExtractor(), reportHandler.DeletePost)                   // delete job(requiere autorización de admin)
	adminGroup.Delete("/deleteContentReport", middleware.UseExtractor(), reportHandler.DeleteContentReport) // Crear reporte

	// admin tags
	adminGroup.Get("/tags", reportHandler.GetAllTagsHandler)
	adminGroup.Post("/tags", middleware.UseExtractor(), reportHandler.AddTagHandler)
	adminGroup.Delete("/tags/:tag", middleware.UseExtractor(), reportHandler.RemoveTagHandler)

}
