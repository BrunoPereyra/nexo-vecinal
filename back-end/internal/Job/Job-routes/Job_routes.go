package jobroutes

import (
	jobapplication "back-end/internal/Job/Job-application"
	jobinfrastructure "back-end/internal/Job/Job-infrastructure"
	Jobinterfaces "back-end/internal/Job/Job-interfaces"
	"back-end/pkg/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
)

func JobRoutes(App *fiber.App, redisClient *redis.Client, newMongoDB *mongo.Client) {

	JobRepository := jobinfrastructure.NewjobRepository(redisClient, newMongoDB)
	JobService := jobapplication.NewJobService(JobRepository)
	JobHandler := Jobinterfaces.NewJobHandler(JobService)

	App.Post("/job/create", middleware.UseExtractor(), JobHandler.CreateJob)                                         // Crear un nuevo trabajo
	App.Post("/job/apply", middleware.UseExtractor(), JobHandler.ApplyToJob)                                         // Postularse a un trabajo
	App.Put("/job/assign", middleware.UseExtractor(), JobHandler.AssignJob)                                          // Asignar un trabajador a un trabajo
	App.Put("/job/reassign", middleware.UseExtractor(), JobHandler.ReassignJob)                                      // Reasignar un trabajador a un trabajo
	App.Post("/job/employer-feedback", middleware.UseExtractor(), JobHandler.ProvideEmployerFeedback)                // Feedback del empleador
	App.Post("/job/worker-feedback", middleware.UseExtractor(), JobHandler.ProvideWorkerFeedback)                    // Feedback del empleado
	App.Post("/job/get-jobsBy-filters", middleware.UseExtractor(), JobHandler.GetJobsByFilters)                      // GetJobsByFilters
	App.Post("/job/update-job-statusTo-completed", middleware.UseExtractor(), JobHandler.UpdateJobStatusToCompleted) // CreateJob maneja la creación de un nuevo job.
	App.Post("/job/get-job-token-admin", middleware.UseExtractor(), JobHandler.GetJobTokenAdmin)                     // obtiene detalles de un trabajo (admin)
	App.Get("/job/get-jobIdEmploye", middleware.UseExtractor(), JobHandler.GetJobByIDForEmployee)                    // obtiene detalles de un trabajo (admin)

}
