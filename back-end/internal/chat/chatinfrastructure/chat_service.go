// internal/chat/chatinfrastructure/chat_repository.go
package chatinfrastructure

import (
	"context"
	"fmt"
	"time"

	"back-end/internal/chat/chatdomain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ChatRepository se encarga de la persistencia de mensajes.
type ChatRepository struct {
	mongoClient *mongo.Client
}

// NewChatRepository crea una nueva instancia de ChatRepository.
func NewChatRepository(mongoClient *mongo.Client) *ChatRepository {
	return &ChatRepository{mongoClient: mongoClient}
}

// SendMessage guarda un mensaje en la colección "chat_messages".
func (r *ChatRepository) SendMessage(ctx context.Context, msg chatdomain.ChatMessage) error {
	collection := r.mongoClient.Database("your_database").Collection("chat_messages")
	msg.ID = primitive.NewObjectID()
	msg.CreatedAt = time.Now()
	msg.IsRead = false
	_, err := collection.InsertOne(ctx, msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %v", err)
	}
	return nil
}

// GetMessagesBetween obtiene los mensajes intercambiados entre dos usuarios, ordenados de más antiguos a más nuevos.
func (r *ChatRepository) GetMessagesBetween(ctx context.Context, user1, user2 string) ([]chatdomain.ChatMessage, error) {
	user1ID, err := primitive.ObjectIDFromHex(user1)
	if err != nil {
		return nil, fmt.Errorf("invalid user1 id: %v", err)
	}
	user2ID, err := primitive.ObjectIDFromHex(user2)
	if err != nil {
		return nil, fmt.Errorf("invalid user2 id: %v", err)
	}
	collection := r.mongoClient.Database("your_database").Collection("chat_messages")
	filter := bson.M{
		"$or": []bson.M{
			{"senderId": user1ID, "receiverId": user2ID},
			{"senderId": user2ID, "receiverId": user1ID},
		},
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %v", err)
	}
	var messages []chatdomain.ChatMessage
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, fmt.Errorf("failed to decode messages: %v", err)
	}
	return messages, nil
}

// MarkMessageAsRead marca un mensaje como leído.
func (r *ChatRepository) MarkMessageAsRead(ctx context.Context, messageID string) error {
	msgID, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return fmt.Errorf("invalid message id: %v", err)
	}
	collection := r.mongoClient.Database("your_database").Collection("chat_messages")
	update := bson.M{"$set": bson.M{"isRead": true}}
	res, err := collection.UpdateOne(ctx, bson.M{"_id": msgID}, update)
	if err != nil {
		return fmt.Errorf("failed to mark message as read: %v", err)
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("message not found")
	}
	return nil
}
