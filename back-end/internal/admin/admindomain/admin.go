package admindomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserReport representa el reporte de un usuario por otro.
type UserReport struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ReportedUserID primitive.ObjectID `json:"reportedUserId" bson:"reportedUserId"` // Usuario que es reportado
	ReporterUserID primitive.ObjectID `json:"reporterUserId" bson:"reporterUserId"` // Usuario que realiza el reporte
	Text           string             `json:"text" bson:"text"`                     // Motivo o comentario del reporte
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt"`           // Fecha del reporte
	Read           bool               `json:"read" bson:"read"`                     // Indica si el reporte ha sido leído
}
