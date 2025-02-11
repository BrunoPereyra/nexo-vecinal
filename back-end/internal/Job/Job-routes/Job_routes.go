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
	job := App.Group("/job", middleware.UseExtractor())

	job.Post("/create", JobHandler.CreateJob)                                                // Crear un nuevo trabajo
	job.Post("/:jobId/apply", JobHandler.ApplyToJob)                                         // Postularse a un trabajo
	job.Put("/:jobId/assign", JobHandler.AssignJob)                                          // Asignar un trabajador a un trabajo
	job.Put("/:jobId/reassign", JobHandler.ReassignJob)                                      // Reasignar un trabajador a un trabajo
	job.Post("/:jobId/employer-feedback", JobHandler.ProvideEmployerFeedback)                // Feedback del empleador
	job.Post("/:jobId/worker-feedback", JobHandler.ProvideWorkerFeedback)                    // Feedback del empleado
	job.Post("/:jobId/get-jobsBy-filters", JobHandler.GetJobsByFilters)                      // GetJobsByFilters
	job.Post("/:jobId/update-job-statusTo-completed", JobHandler.UpdateJobStatusToCompleted) // CreateJob maneja la creación de un nuevo job.
}
