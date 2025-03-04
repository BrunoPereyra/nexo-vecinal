// internal/support/supportdomain/support_message.go
package supportdomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SupportMessage representa un mensaje del chat de soporte.
type SupportMessage struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SenderID   primitive.ObjectID `bson:"senderId" json:"senderId"`
	ReceiverID primitive.ObjectID `bson:"receiverId" json:"receiverId"`
	Text       string             `bson:"text" json:"text"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	IsRead     bool               `bson:"isRead" json:"isRead"`
}

type UserInfo struct {
	ID       primitive.ObjectID `bson:"_id" json:"id"`
	NameUser string             `bson:"NameUser" json:"NameUser"`
	Avatar   string             `bson:"Avatar" json:"Avatar"`
}

// Conversation representa una conversación entre el agente de soporte y otro usuario.
type Conversation struct {
	User        UserInfo       `bson:"User" json:"User"`
	LastMessage SupportMessage `bson:"lastMessage" json:"lastMessage"`
}
