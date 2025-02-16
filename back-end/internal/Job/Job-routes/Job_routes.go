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

	App.Post("/job/create", middleware.UseExtractor(), JobHandler.CreateJob)                                 // Crear un nuevo trabajo
	App.Post("/job/apply", middleware.UseExtractor(), JobHandler.ApplyToJob)                                 // Postularse a un trabajo
	App.Put("/job/:jobId/assign", middleware.UseExtractor(), JobHandler.AssignJob)                           // Asignar un trabajador a un trabajo
	App.Put("/job/:jobId/reassign", middleware.UseExtractor(), JobHandler.ReassignJob)                       // Reasignar un trabajador a un trabajo
	App.Post("/job/:jobId/worker-feedback", middleware.UseExtractor(), JobHandler.ProvideWorkerFeedback)     // Feedback del empleado
	App.Post("/job/:jobId/employer-feedback", middleware.UseExtractor(), JobHandler.ProvideEmployerFeedback) // Feedback del empleador

	App.Post("/job/get-jobsBy-filters", middleware.UseExtractor(), JobHandler.GetJobsByFilters)                      // GetJobsByFilters
	App.Post("/job/update-job-statusTo-completed", middleware.UseExtractor(), JobHandler.UpdateJobStatusToCompleted) // CreateJob maneja la creación de un nuevo job.

	App.Post("/job/get-job-token-admin", middleware.UseExtractor(), JobHandler.GetJobTokenAdmin)  // obtiene detalles de un trabajo (admin)
	App.Get("/job/get-jobIdEmploye", middleware.UseExtractor(), JobHandler.GetJobByIDForEmployee) // obtiene detalles para trabajadores
	//Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación
	App.Get("/job/get-jobs-profile", middleware.UseExtractor(), JobHandler.GetJobsProfile)
	App.Get("/job/get-jobs-user-Employe-profile", middleware.UseExtractor(), JobHandler.GetJobsUserIDForEmployeProfile)
	// profile visited
	App.Get("/job/get-jobs-profile-vist", JobHandler.GetJobsProfilevist)
	App.Get("/job/get-jobs-user-Employe-profile-vist", JobHandler.GetJobsUserIDForEmployeProfilevist)

	// rating
	App.Get("/job/get-latest-jobs-worker", middleware.UseExtractor(), JobHandler.GetLatestJobsForWorker)
	App.Get("/job/get-latest-jobs-employe", middleware.UseExtractor(), JobHandler.GetLatestJobsForEmployer)

	// visited
	App.Get("/job/get-latest-jobs-worker-vist", JobHandler.GetLatestJobsForWorkervist)
	App.Get("/job/get-latest-jobs-employe-vist", JobHandler.GetLatestJobsForEmployervist)
}
