// internal/chat/chatdomain/chat.go
package chatdomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatRoom representa el documento central que identifica el chat entre dos usuarios.
type ChatRoom struct {
	ID           primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Participant1 primitive.ObjectID   `json:"participant1" bson:"participant1"`
	Participant2 primitive.ObjectID   `json:"participant2" bson:"participant2"`
	BlockedBy    []primitive.ObjectID `json:"blockedBy,omitempty" bson:"blockedBy,omitempty"`
	CreatedAt    time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time            `json:"updatedAt" bson:"updatedAt"`
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
type ChatDetails struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Participant1 primitive.ObjectID   `bson:"participant1" json:"participant1"`
	Participant2 primitive.ObjectID   `bson:"participant2" json:"participant2"`
	BlockedBy    []primitive.ObjectID `bson:"blockedBy,omitempty" json:"blockedBy,omitempty"`
	CreatedAt    time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updatedAt" json:"updatedAt"`
	OtherUser    struct {
		ID       primitive.ObjectID `bson:"_id" json:"id"`
		NameUser string             `bson:"NameUser" json:"nameUser"`
		Avatar   string             `bson:"Avatar" json:"avatar"`
	} `bson:"otherUser" json:"otherUser"`
}
