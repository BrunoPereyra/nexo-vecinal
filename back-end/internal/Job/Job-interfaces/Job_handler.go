package Jobinterfaces

import (
	Jobapplication "back-end/internal/Job/Job-application"
	jobdomain "back-end/internal/Job/Job-domain"
	"back-end/pkg/helpers"
	"encoding/json"
	"strconv"
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
	// Extraer el campo location como string
	locationStr := c.FormValue("locationStr")

	if locationStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Location is required",
		})
	}

	var location jobdomain.GeoPoint

	if err := json.Unmarshal([]byte(locationStr), &location); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid location format",
			"error":   err.Error(),
		})
	}

	createReq.Location = location
	if err := c.BodyParser(&createReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
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
	fileHeader, err := c.FormFile("image")
	if err == nil && fileHeader != nil {
		postImageCh := make(chan string)
		errCh := make(chan error)

		// Procesa la imagen de forma asíncrona
		go helpers.ProcessImage(fileHeader, postImageCh, errCh, "job")

		select {
		case imageUrl := <-postImageCh:
			createReq.Image = imageUrl
		case procErr := <-errCh:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Error processing image",
				"error":   procErr.Error(),
			})
		}
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
	var job jobdomain.JobData
	if err := c.BodyParser(&job); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	if err := job.ValidateJobData(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
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
	if err = j.JobService.ApplyToJob(job.JobId, applicantID, job.Proposal, job.Price); err != nil {
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
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	if err = j.JobService.ProvideEmployerFeedback(jobID, userID, feedback); err != nil {
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
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	if err = j.JobService.ProvideWorkerFeedback(jobID, userID, feedback); err != nil {
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
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	jobs, err := j.JobService.FindJobsByTagsAndLocation(reqFilyer, page)
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
		if err.Error() == "job already completed" {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"message": "StatusOK",
				"job":     err.Error(),
			})
		}
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "StatusConflict",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "UpdateJobStatusToCompleted",
		"job":     jobID,
	})
}

// CreateJob maneja la creación de un nuevo job.
func (j *JobHandler) GetJobByIDForEmployee(c *fiber.Ctx) error {
	// Obtener el jobId desde los parámetros de la URL (query)
	jobID := c.Query("jobId")

	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "jobId es requerido",
		})
	}
	jobIDPr, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	job, err := j.JobService.GetJobByIDForEmployee(jobIDPr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Error al obtener el job",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"job":     job,
	})
}

// CreateJob maneja la creación de un nuevo job.
func (j *JobHandler) GetJobTokenAdmin(c *fiber.Ctx) error {
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
	jobID, err := j.JobService.GetJobTokenAdmin(req.JobId, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"job":     jobID,
	})
}

// Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación
func (j *JobHandler) GetJobsProfile(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	jobs, err := j.JobService.GetJobsProfile(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}

// Realiza una petición GET para obtener los trabajos como empleado del perfil del usuario con paginación
func (j *JobHandler) GetJobsUserIDForEmployeProfile(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	jobs, err := j.JobService.GetJobsByUserIDForEmploye(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}

// profile vist

// GetJobsUserIDForEmployeProfile obtiene los trabajos como empleado del perfil del usuario con paginación
func (j *JobHandler) GetJobsUserIDForEmployeProfilevist(c *fiber.Ctx) error {
	// Extraer el userID desde la query (por ejemplo, ?id=...)
	userIdStr := c.Query("id", "")
	if userIdStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "User id is required in query",
		})
	}
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	// Obtener la página de la query, con valor predeterminado "1"
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	jobs, err := j.JobService.GetJobsProfile(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}

func (j *JobHandler) GetJobsProfilevist(c *fiber.Ctx) error {
	// Extraer el userID desde la query (por ejemplo, ?id=...)
	userIdStr := c.Query("id", "")
	if userIdStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "User id is required in query",
		})
	}
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	// Obtener la página de la query, con valor predeterminado "1"
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	jobs, err := j.JobService.GetJobsProfile(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}
func (j *JobHandler) GetLatestJobsForEmployer(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	Rating, err := j.JobService.GetLatestJobsForEmployer(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"Rating":  Rating,
	})
}
func (j *JobHandler) GetLatestJobsForWorker(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	Rating, err := j.JobService.GetLatestJobsForWorker(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"Rating":  Rating,
	})
}
func (j *JobHandler) GetLatestJobsForEmployervist(c *fiber.Ctx) error {
	// Obtener el id desde la query string
	idStr := c.Query("id")
	if idStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "El id es requerido",
		})
	}

	userID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "ID inválido",
			"error":   err.Error(),
		})
	}

	Rating, err := j.JobService.GetLatestJobsForEmployer(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"Rating":  Rating,
	})
}

func (j *JobHandler) GetLatestJobsForWorkervist(c *fiber.Ctx) error {
	// Obtener el id desde la query string
	idStr := c.Query("id")
	if idStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "El id es requerido",
		})
	}

	userID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "ID inválido",
			"error":   err.Error(),
		})
	}

	Rating, err := j.JobService.GetLatestJobsForWorker(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"Rating":  Rating,
	})
}

func (j *JobHandler) GetJobsAssignedNoCompleted(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userid, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid applicant ID",
		})
	}

	// Leer parámetros de paginación con valores por defecto
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	// Se asume que el servicio se ha modificado para recibir page y limit
	jobs, err := j.JobService.GetJobsAssignedNoCompleted(userid, page)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error retrieving jobs",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"data":    jobs,
	})
}

func (j *JobHandler) GetJobsAssignedCompleted(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userid, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid applicant ID",
		})
	}

	// Leer parámetros de paginación
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	jobs, err := j.JobService.GetJobsAssignedCompleted(userid, page)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error retrieving jobs",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"data":    jobs,
	})
}

func (j *JobHandler) GetJobsUserCompletedVisited(c *fiber.Ctx) error {
	idUser := c.Query("id")
	userid, err := primitive.ObjectIDFromHex(idUser)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
			"error":   err.Error(),
		})
	}

	// Leer parámetros de paginación
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	jobs, err := j.JobService.GetJobsAssignedCompleted(userid, page)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error retrieving jobs",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"data":    jobs,
	})
}
func (j *JobHandler) GetJobDetailvisited(c *fiber.Ctx) error {
	idUser := c.Query("id")
	userid, err := primitive.ObjectIDFromHex(idUser)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
			"error":   err.Error(),
		})
	}
	jobs, err := j.JobService.GetJobDetailvisited(userid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error retrieving jobs",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"job":     jobs,
	})
}

func (j *JobHandler) GetRecommendedJobsForUser(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	jobs, err := j.JobService.GetRecommendedJobsForUser(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}

// GetJobRequestsReceived
func (j *JobHandler) GetJobRequestsReceived(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	jobs, err := j.JobService.GetJobRequestsReceived(userID, page)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"jobs":    jobs,
	})
}

// AcceptJobRequest permite que el trabajador acepte una solicitud directa
func (j *JobHandler) AcceptJobRequest(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	workerID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}

	var body struct {
		JobID string `json:"jobId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Bad Request"})
	}
	jobID, err := primitive.ObjectIDFromHex(body.JobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid job ID"})
	}

	err = j.JobService.AcceptJobRequest(jobID, workerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "No autorizado o error al aceptar", "error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Trabajo aceptado correctamente"})
}

// RejectJobRequest permite que el trabajador rechace una solicitud directa
func (j *JobHandler) RejectJobRequest(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	workerID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}

	var body struct {
		JobID string `json:"jobId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Bad Request"})
	}
	jobID, err := primitive.ObjectIDFromHex(body.JobID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid job ID"})
	}

	err = j.JobService.RejectJobRequest(jobID, workerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "No autorizado o error al rechazar", "error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Trabajo rechazado correctamente"})
}
