package Jobinterfaces

import (
	Jobapplication "back-end/internal/Job/Job-application"
	jobdomain "back-end/internal/Job/Job-domain"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobHandler se encarga de exponer los endpoints HTTP para las operaciones de job.
type JobHandler struct {
	JobService *Jobapplication.JobService
}

// NewJobHandler crea una nueva instancia de JobHandler.
func NewJobHandler(jobService *Jobapplication.JobService) *JobHandler {
	return &JobHandler{
		JobService: jobService,
	}
}

// CreateJob maneja la creación de un nuevo job.
func (j *JobHandler) CreateJob(c *fiber.Ctx) error {
	var createReq jobdomain.CreateJobRequest
	fmt.Println(createReq.Location)
	if err := c.BodyParser(&createReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	if err := createReq.ValidateCreateJobRequest(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	// Se obtiene el ID del usuario desde el token
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	jobID, err := j.JobService.CreateJob(createReq, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not create job",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Job created successfully",
		"job":     jobID,
	})
}

// ApplyToJob permite que el trabajador se postule a un job.
// Se espera que la ruta tenga un parámetro "jobId".
func (j *JobHandler) ApplyToJob(c *fiber.Ctx) error {
	jobIDParam := c.Params("jobId")
	jobID, err := primitive.ObjectIDFromHex(jobIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid job ID",
		})
	}
	// Se obtiene el ID del postulante desde el token
	idValue := c.Context().UserValue("_id").(string)
	applicantID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid applicant ID",
		})
	}
	if err = j.JobService.ApplyToJob(jobID, applicantID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not apply to job",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Applied to job successfully",
	})
}

// AssignJob permite que el empleador asigne un trabajador a un job.
// Se espera que la ruta tenga un parámetro "jobId" y que en el body se envíe "workerId".
func (j *JobHandler) AssignJob(c *fiber.Ctx) error {
	jobIDParam := c.Params("jobId")
	jobID, err := primitive.ObjectIDFromHex(jobIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid job ID",
		})
	}
	var body struct {
		WorkerID string `json:"workerId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	workerID, err := primitive.ObjectIDFromHex(body.WorkerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid worker ID",
		})
	}
	if err = j.JobService.AssignJob(jobID, workerID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not assign job",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Job assigned successfully",
	})
}

// ReassignJob permite al empleador reasignar un job a un nuevo trabajador.
// Se espera que la ruta tenga un parámetro "jobId" y en el body se envíe "newWorkerId".
func (j *JobHandler) ReassignJob(c *fiber.Ctx) error {
	jobIDParam := c.Params("jobId")
	jobID, err := primitive.ObjectIDFromHex(jobIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid job ID",
		})
	}
	var body struct {
		NewWorkerID string `json:"newWorkerId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	newWorkerID, err := primitive.ObjectIDFromHex(body.NewWorkerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid new worker ID",
		})
	}
	if err = j.JobService.ReassignJob(jobID, newWorkerID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not reassign job",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Job reassigned successfully",
	})
}

// ProvideEmployerFeedback permite que el empleador deje feedback sobre el trabajador.
// Se espera que la ruta tenga un parámetro "jobId" y que en el body se envíe el feedback.
func (j *JobHandler) ProvideEmployerFeedback(c *fiber.Ctx) error {
	jobIDParam := c.Params("jobId")
	jobID, err := primitive.ObjectIDFromHex(jobIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid job ID",
		})
	}
	var feedback jobdomain.Feedback
	if err := c.BodyParser(&feedback); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	feedback.CreatedAt = time.Now()
	if err = j.JobService.ProvideEmployerFeedback(jobID, feedback); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not provide employer feedback",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Employer feedback provided successfully",
	})
}

// ProvideWorkerFeedback permite que el trabajador deje feedback sobre el empleador.
// Se espera que la ruta tenga un parámetro "jobId" y que en el body se envíe el feedback.
func (j *JobHandler) ProvideWorkerFeedback(c *fiber.Ctx) error {
	jobIDParam := c.Params("jobId")
	jobID, err := primitive.ObjectIDFromHex(jobIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid job ID",
		})
	}
	var feedback jobdomain.Feedback
	if err := c.BodyParser(&feedback); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	feedback.CreatedAt = time.Now()
	if err = j.JobService.ProvideWorkerFeedback(jobID, feedback); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not provide worker feedback",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Worker feedback provided successfully",
	})
}
func (j *JobHandler) GetJobsByFilters(c *fiber.Ctx) error {
	// Ejemplo: se reciben los filtros desde el body en formato JSON.
	var reqFilyer jobdomain.FindJobsByTagsAndLocation
	if err := c.BodyParser(&reqFilyer); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Solicitud inválida"})
	}
	if err := reqFilyer.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}

	jobs, err := j.JobService.FindJobsByTagsAndLocation(reqFilyer)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error al obtener trabajos", "error": err.Error()})
	}

	return c.JSON(jobs)
}

// CreateJob maneja la creación de un nuevo job.
func (j *JobHandler) UpdateJobStatusToCompleted(c *fiber.Ctx) error {
	var req jobdomain.JobId
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	jobID, err := j.JobService.UpdateJobStatusToCompleted(req.JobId, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "UpdateJobStatusToCompleted",
		"job":     jobID,
	})
}
