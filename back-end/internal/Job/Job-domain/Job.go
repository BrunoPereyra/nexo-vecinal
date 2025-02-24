package jobdomain

import (
	"time"

	"github.com/go-playground/validator"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobStatus representa los distintos estados que puede tener una publicación.
type JobStatus string

const (
	JobStatusOpen       JobStatus = "open"        // Abierto, esperando postulaciones
	JobStatusInProgress JobStatus = "in_progress" // En curso, ya se eligió un trabajador
	JobStatusCompleted  JobStatus = "completed"   // Finalizado y cerrado
	JobStatusCancelled  JobStatus = "cancelled"   // Cancelado
)

// Feedback representa la opinión y puntuación que puede dejar un usuario.
type Feedback struct {
	Comment   string    `json:"comment" bson:"comment"`     // Comentario u opinión
	Rating    int       `json:"rating" bson:"rating"`       // Puntuación (por ejemplo, de 1 a 5)
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"` // Fecha en la que se dejó la opinión
}

// GeoPoint representa una ubicación en formato GeoJSON.
type GeoPoint struct {
	Type        string    `bson:"type" json:"type"`               // Siempre "Point"
	Coordinates []float64 `bson:"coordinates" json:"coordinates"` // [longitud, latitud]
}

// Application representa la postulación de un usuario con su propuesta y precio.
type Application struct {
	ApplicantID primitive.ObjectID `json:"applicantId" bson:"applicantId"`
	Proposal    string             `json:"proposal" bson:"proposal" validate:"max=100"` // Máximo 100 caracteres
	Price       float64            `json:"price" bson:"price"`
	AppliedAt   time.Time          `json:"appliedAt" bson:"appliedAt"`
}

// Job representa la estructura de una publicación de trabajo o necesidad.
type Job struct {
	ID                  primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID              primitive.ObjectID `jzson:"userId" bson:"userId"`
	Title               string             `json:"title" bson:"title"`
	Description         string             `json:"description" bson:"description"`
	Location            GeoPoint           `json:"location" bson:"location"`
	Tags                []string           `json:"tags" bson:"tags"`
	Budget              float64            `json:"budget" bson:"budget"`
	FinalCost           float64            `json:"finalCost" bson:"finalCost"`
	Status              JobStatus          `json:"status" bson:"status"`
	Applicants          []Application      `json:"applicants" bson:"applicants"` // Ahora cada postulación incluye propuesta y precio.
	AssignedApplication *Application       `json:"assignedApplication,omitempty" bson:"assignedApplication,omitempty"`
	EmployerFeedback    *Feedback          `json:"employerFeedback,omitempty" bson:"employerFeedback,omitempty"`
	WorkerFeedback      *Feedback          `json:"workerFeedback,omitempty" bson:"workerFeedback,omitempty"`
	CreatedAt           time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt           time.Time          `json:"updatedAt" bson:"updatedAt"`

	PaymentStatus   string  `json:"paymentStatus" bson:"paymentStatus"`
	PaymentAmount   float64 `json:"paymentAmount" bson:"paymentAmount"`
	PaymentIntentID string  `json:"paymentIntentId" bson:"paymentIntentId"`
}

// CreateJobRequest representa la información necesaria para crear un job.
type CreateJobRequest struct {
	Title       string   `json:"title" validate:"required,min=3,max=100"`         // Título del trabajo (requerido, entre 3 y 100 caracteres)
	Description string   `json:"description" validate:"required,min=10,max=1000"` // Descripción detallada (requerido, entre 10 y 1000 caracteres)
	Location    GeoPoint `json:"location" validate:"required"`                    // Ubicación o zona del trabajo (requerido)
	Tags        []string `json:"tags" validate:"required,dive,required"`          // Etiquetas para clasificar el trabajo (al menos una requerida)
	Budget      float64  `json:"budget" validate:"required,gt=0"`                 // Presupuesto estimado (debe ser mayor a 2000)
}

func (u *CreateJobRequest) ValidateCreateJobRequest() error {
	validate := validator.New()
	return validate.Struct(u)
}

type CreatePaymentRequest struct {
	JobID    string `json:"job_id"`   // para relacionar el pago con el job
	Amount   int64  `json:"amount"`   // monto en centavos (ej. 1000 = $10.00)
	Currency string `json:"currency"` // ej. "usd"
}

// CreatePaymentResponse es la respuesta al crear el PaymentIntent.
type CreatePaymentResponse struct {
	PaymentIntentID string `json:"payment_intent_id"`
	ClientSecret    string `json:"client_secret"`
}

// CapturePaymentRequest es el payload para capturar el PaymentIntent.
type CapturePaymentRequest struct {
	PaymentIntentID string `json:"payment_intent_id"`
}

// TransferPaymentRequest es el payload para transferir fondos al trabajador.
type TransferPaymentRequest struct {
	PaymentIntentID string `json:"payment_intent_id"`
	WorkerAccountID string `json:"worker_account_id"` // cuenta conectada del trabajador
	// Opcional: monto en centavos a transferir (si se quiere forzar un monto distinto)
	Amount int64 `json:"amount,omitempty"`
}

// TransferPaymentResponse es la respuesta luego de crear la transferencia.
type TransferPaymentResponse struct {
	TransferID string `json:"transfer_id"`
}
type FindJobsByTagsAndLocation struct {
	Tags           []string `json:"tags" validate:"dive"`
	Longitude      float64  `json:"longitude" validate:"required,gte=-180,lte=180"`
	Latitude       float64  `json:"latitude" validate:"required,gte=-90,lte=90"`
	RadiusInMeters float64  `json:"radius" validate:"required,gt=0,lte=100000"`
	Title          string   `json:"title" validate:"required,min=3,max=100"`
}

func (u *FindJobsByTagsAndLocation) Validate() error {
	validate := validator.New()
	return validate.Struct(u)
}

type JobData struct {
	JobId    primitive.ObjectID `json:"JobId" validate:"required"`
	Price    float64            `json:"price" validate:"required"`
	Proposal string             `json:"Proposal" validate:"required,min=3,max=100"`
}

func (job JobData) ValidateJobData() error {
	validate := validator.New()
	return validate.Struct(job)
}

type JobId struct {
	JobId primitive.ObjectID `json:"JobId" validate:"required"`
}
type User struct {
	ID       primitive.ObjectID `json:"id" bson:"_id"`
	NameUser string             `json:"nameUser" bson:"NameUser"`
	Avatar   string             `json:"avatar" bson:"Avatar"`
}

// ApplicantDetails representa la postulación enriquecida con los datos completos del usuario.
type ApplicantDetails struct {
	ApplicantID primitive.ObjectID `json:"applicantId" bson:"applicantId"`
	Proposal    string             `json:"proposal" bson:"proposal"`
	Price       float64            `json:"price" bson:"price"`
	AppliedAt   time.Time          `json:"appliedAt" bson:"appliedAt"`
	// UserData contiene la información del usuario postulante (extraída con $lookup)
	UserData *User `json:"userData,omitempty" bson:"userData,omitempty"`
}

// JobDetailsUsers es la estructura final del job, incluyendo datos del creador, las aplicaciones y
// la información del trabajador asignado (fusionada de assignedApplication y los datos del usuario).
type JobDetailsUsers struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId"`
	UserDetails *User              `json:"userDetails,omitempty" bson:"userDetails,omitempty"` // Datos del creador
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	Location    GeoPoint           `json:"location" bson:"location"`
	Tags        []string           `json:"tags" bson:"tags"`
	Budget      float64            `json:"budget" bson:"budget"`
	FinalCost   float64            `json:"finalCost" bson:"finalCost"`
	Status      JobStatus          `json:"status" bson:"status"`
	Applicants  []ApplicantDetails `json:"applicants" bson:"applicants"`
	// En AssignedTo se fusiona el objeto assignedApplication con los datos del usuario asignado
	AssignedTo       *ApplicantDetails `json:"assignedTo,omitempty" bson:"assignedTo,omitempty"`
	EmployerFeedback *Feedback         `json:"employerFeedback,omitempty" bson:"employerFeedback,omitempty"`
	WorkerFeedback   *Feedback         `json:"workerFeedback,omitempty" bson:"workerFeedback,omitempty"`
	CreatedAt        time.Time         `json:"createdAt" bson:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt" bson:"updatedAt"`
	PaymentStatus    string            `json:"paymentStatus" bson:"paymentStatus"`
	PaymentAmount    float64           `json:"paymentAmount" bson:"paymentAmount"`
	PaymentIntentID  string            `json:"paymentIntentId" bson:"paymentIntentId"`
}

type GetJobByIDForEmployee struct {
	ID               primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	UserID           primitive.ObjectID  `json:"userId" bson:"userId"`
	Title            string              `json:"title" bson:"title"`
	Description      string              `json:"description" bson:"description"`
	Location         GeoPoint            `json:"location" bson:"location"`
	Tags             []string            `json:"tags" bson:"tags"`
	Budget           float64             `json:"budget" bson:"budget"`
	FinalCost        float64             `json:"finalCost" bson:"finalCost"`
	Status           JobStatus           `json:"status" bson:"status"`
	User             User                `json:"user" bson:"user"`
	EmployerFeedback *Feedback           `json:"employerFeedback,omitempty" bson:"employerFeedback,omitempty"`
	WorkerFeedback   *Feedback           `json:"workerFeedback,omitempty" bson:"workerFeedback,omitempty"`
	CreatedAt        time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt        time.Time           `json:"updatedAt" bson:"updatedAt"`
	PaymentStatus    string              `json:"paymentStatus" bson:"paymentStatus"`
	PaymentAmount    float64             `json:"paymentAmount" bson:"paymentAmount"`
	PaymentIntentID  string              `json:"paymentIntentId" bson:"paymentIntentId"`
	AssignedTo       *primitive.ObjectID `json:"assignedTo,omitempty" bson:"assignedTo,omitempty"`
}
