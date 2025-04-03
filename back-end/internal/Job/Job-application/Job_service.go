package Jobapplication

import (
	jobdomain "back-end/internal/Job/Job-domain"
	jobinfrastructure "back-end/internal/Job/Job-infrastructure"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobService se encarga de la lógica de negocio relacionada con los jobs.
type JobService struct {
	JobRepository *jobinfrastructure.JobRepository
}

// NewJobService crea una nueva instancia de JobService.
func NewJobService(jobRepository *jobinfrastructure.JobRepository) *JobService {
	return &JobService{
		JobRepository: jobRepository,
	}
}

// CreateJob crea una nueva publicación de trabajo a partir de la información del request y el ID del usuario creador.
func (js *JobService) CreateJob(createReq jobdomain.CreateJobRequest, userID primitive.ObjectID) (primitive.ObjectID, error) {
	newJob := jobdomain.Job{
		UserID:              userID,
		Title:               createReq.Title,
		Description:         createReq.Description,
		Location:            createReq.Location,
		Tags:                createReq.Tags,
		Budget:              createReq.Budget,
		FinalCost:           0,                         // Se asigna en una etapa posterior
		Status:              jobdomain.JobStatusOpen,   // Estado inicial
		Applicants:          []jobdomain.Application{}, // Sin postulantes inicialmente
		AssignedApplication: &jobdomain.Application{},  // Sin asignación inicial
		EmployerFeedback:    nil,
		WorkerFeedback:      nil,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
		Images:              []string{createReq.Image},
	}

	jobID, err := js.JobRepository.CreateJob(newJob)
	if err != nil {
		return jobID, err
	}

	return jobID, nil
}

// ApplyToJob permite que un trabajador se postule a un job.
func (js *JobService) ApplyToJob(jobID, applicantID primitive.ObjectID, proposal string, price float64) error {
	return js.JobRepository.ApplyToJob(jobID, applicantID, proposal, price)
}

// AssignJob asigna a un trabajador a un job, cambiando el estado a "in_progress".
func (js *JobService) AssignJob(jobID, workerID primitive.ObjectID) error {
	return js.JobRepository.AssignJob(jobID, workerID)
}

// ReassignJob permite reasignar el job a un nuevo trabajador en caso de inconvenientes.
func (js *JobService) ReassignJob(jobID, newWorkerID primitive.ObjectID) error {
	return js.JobRepository.ReassignJob(jobID, newWorkerID)
}

// ProvideEmployerFeedback permite que el empleador deje feedback sobre el trabajador.
func (js *JobService) ProvideEmployerFeedback(jobID, userid primitive.ObjectID, feedback jobdomain.Feedback) error {
	return js.JobRepository.ProvideEmployerFeedback(jobID, userid, feedback)
}

// ProvideWorkerFeedback permite que el trabajador deje feedback sobre el empleador.
func (js *JobService) ProvideWorkerFeedback(jobID, userid primitive.ObjectID, feedback jobdomain.Feedback) error {
	return js.JobRepository.ProvideWorkerFeedback(jobID, userid, feedback)
}
func (js *JobService) RegisterPayment(jobID primitive.ObjectID, amount float64) error {
	job, err := js.JobRepository.GetJobByID(jobID)
	if err != nil {
		return err
	}

	if job.PaymentStatus == "paid" || job.PaymentStatus == "released" {
		return errors.New("El pago ya fue procesado anteriormente")
	}

	update := bson.M{
		"$set": bson.M{
			"paymentStatus": "paid",
			"paymentAmount": amount,
			"updatedAt":     time.Now(),
		},
	}

	err = js.JobRepository.UpdateJob(jobID, update)
	if err != nil {
		return err
	}

	// Notificar al trabajador que el pago ha sido realizado y retenido
	// if job.AssignedTo != nil {
	// 	js.notifyWorker(*job.AssignedTo, "El pago para el trabajo ha sido realizado y está retenido hasta su finalización.")
	// }

	return nil
}
func (js *JobService) UpdateJobPaymentStatus(jobID primitive.ObjectID, status string, paymentIntentID string) error {
	return js.JobRepository.UpdateJobPaymentStatus(jobID, status, paymentIntentID)
}
func (js *JobService) GetJobByIDForEmployee(jobID primitive.ObjectID) (*jobdomain.GetJobByIDForEmployee, error) {
	return js.JobRepository.GetJobByIDForEmployee(jobID)

}

func (js *JobService) FindJobsByTagsAndLocation(jobFilter jobdomain.FindJobsByTagsAndLocation, page int) ([]jobdomain.JobDetailsUsers, error) {
	return js.JobRepository.FindJobsByTagsAndLocation(jobFilter, page)
}
func (js *JobService) UpdateJobStatusToCompleted(jobId, UserId primitive.ObjectID) (*jobdomain.Job, error) {
	return js.JobRepository.UpdateJobStatusToCompleted(jobId, UserId)
}
func (js *JobService) GetJobTokenAdmin(jobId, UserId primitive.ObjectID) (*jobdomain.JobDetailsUsers, error) {
	Job, err := js.JobRepository.GetJobDetails(jobId, UserId)
	return Job, err
}
func (js *JobService) GetJobDetailvisited(jobId primitive.ObjectID) (*jobdomain.JobDetailsUsers, error) {
	return js.JobRepository.GetJobDetailvisited(jobId)
}

// Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación
func (js *JobService) GetJobsProfile(jobID primitive.ObjectID, page int) ([]jobdomain.Job, error) {
	return js.JobRepository.GetJobsByUserID(jobID, page)

}
func (js *JobService) GetJobsByUserIDForEmploye(jobID primitive.ObjectID, page int) ([]jobdomain.Job, error) {
	return js.JobRepository.GetJobsByUserIDForEmploye(jobID, page)

}
func (js *JobService) GetLatestJobsForWorker(jobID primitive.ObjectID) (float64, error) {
	return js.JobRepository.GetAverageRatingForWorker(jobID)

}
func (js *JobService) GetLatestJobsForEmployer(jobID primitive.ObjectID) (float64, error) {
	return js.JobRepository.GetAverageRatingForEmployer(jobID)

}
func (js *JobService) GetJobsAssignedNoCompleted(jobID primitive.ObjectID, page int) ([]jobdomain.JobDetailsUsers, error) {
	return js.JobRepository.GetJobsAssignedNoCompleted(jobID, page)

}
func (js *JobService) GetJobsAssignedCompleted(jobID primitive.ObjectID, page int) ([]jobdomain.JobDetailsUsers, error) {
	return js.JobRepository.GetJobsAssignedCompleted(jobID, page)

}

// GetRecommendedUsers obtiene la lista de usuarios recomendados con filtros y paginación.
func (js *JobService) GetRecommendedUsers(categories []string, page, limit int) ([]jobdomain.User, error) {
	return js.JobRepository.GetRecommendedUsers(categories, page, limit)
}
