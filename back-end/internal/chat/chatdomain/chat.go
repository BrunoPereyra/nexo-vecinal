package chatdomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatRoom representa el documento central que identifica el chat entre dos usuarios.
// Se utiliza el campo "participants" para almacenar de forma ordenada los IDs de los dos participantes.
type ChatRoom struct {
	ID              primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	ParticipantsKey string               `json:"participantsKey" bson:"participantsKey"`
	Participants    []primitive.ObjectID `json:"participants" bson:"participants"`
	BlockedBy       []primitive.ObjectID `json:"blockedBy,omitempty" bson:"blockedBy,omitempty"`
	CreatedAt       time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time            `json:"updatedAt" bson:"updatedAt"`
}

// ChatMessage representa un mensaje enviado en un chat.
type ChatMessage struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ChatRoomID primitive.ObjectID `json:"chatRoomId" bson:"chatRoomId"`
	SenderID   primitive.ObjectID `json:"senderId" bson:"senderId"`
	ReceiverID primitive.ObjectID `json:"receiverId" bson:"receiverId"`
	Text       string             `json:"text" bson:"text"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
	IsRead     bool               `json:"isRead" bson:"isRead"`
}

// ChatDetails es utilizado para retornar la información agregada de una sala de chat,
// incluyendo el otro participante, el cual se obtiene mediante una agregación.
type ChatDetails struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Participants []primitive.ObjectID `bson:"participants" json:"participants"`
	BlockedBy    []primitive.ObjectID `bson:"blockedBy,omitempty" json:"blockedBy,omitempty"`
	CreatedAt    time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updatedAt" json:"updatedAt"`
	OtherUser    struct {
		ID       primitive.ObjectID `bson:"_id" json:"id"`
		NameUser string             `bson:"NameUser" json:"nameUser"`
		Avatar   string             `bson:"Avatar" json:"avatar"`
	} `bson:"otherUser" json:"otherUser"`
}
