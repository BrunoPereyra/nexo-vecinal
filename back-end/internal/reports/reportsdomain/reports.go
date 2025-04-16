package reportsdomain

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

// UserSummary representa la información básica de un usuario.
type UserSummary struct {
	ID       primitive.ObjectID `json:"id" bson:"_id"`
	NameUser string             `json:"NameUser" bson:"NameUser"`
	Avatar   string             `json:"Avatar" bson:"Avatar"`
}

// UserReportResponse representa un reporte enriquecido con la información de los usuarios.
type UserReportResponse struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ReportedUser UserSummary        `json:"reportedUser"`
	ReporterUser UserSummary        `json:"reporterUser"`
	Text         string             `json:"text" bson:"text"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
	Read         bool               `json:"read" bson:"read"`
}
type Tag struct {
	Tag string `bson:"tag" json:"tag"`
}
