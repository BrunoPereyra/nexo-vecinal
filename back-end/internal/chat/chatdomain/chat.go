// internal/chat/chatdomain/chat.go
package chatdomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatMessage representa un mensaje enviado entre usuarios.
type ChatMessage struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	SenderID   primitive.ObjectID `json:"senderId" bson:"senderId"`               // Usuario que envía el mensaje
	ReceiverID primitive.ObjectID `json:"receiverId" bson:"receiverId"`           // Usuario que recibe el mensaje
	JobID      primitive.ObjectID `json:"jobId,omitempty" bson:"jobId,omitempty"` // Opcional: ID del trabajo asociado
	Text       string             `json:"text" bson:"text"`                       // Contenido del mensaje
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`             // Fecha de creación
	IsRead     bool               `json:"isRead" bson:"isRead"`                   // Indica si el mensaje fue leído
}
