// internal/support/supportinfrastructure/support_repository.go
package supportinfrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"back-end/internal/support/supportdomain"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SupportRepository gestiona la persistencia de los mensajes de soporte.
type SupportRepository struct {
	mongoClient *mongo.Client
	redisClient *redis.Client
}

// NewSupportRepository crea una nueva instancia de SupportRepository.
func NewSupportRepository(mongoClient *mongo.Client, redisClient *redis.Client) *SupportRepository {
	return &SupportRepository{
		mongoClient: mongoClient,
		redisClient: redisClient,
	}
}

// SendMessage guarda un mensaje en la colección "support_messages" y lo publica en Redis.
func (r *SupportRepository) SendMessage(ctx context.Context, msg supportdomain.SupportMessage) (supportdomain.SupportMessage, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("support_messages")
	msg.ID = primitive.NewObjectID()
	msg.CreatedAt = time.Now()
	msg.IsRead = false
	_, err := collection.InsertOne(ctx, msg)
	if err != nil {
		return supportdomain.SupportMessage{}, fmt.Errorf("failed to send support message: %v", err)
	}

	// Publicar en Redis para notificaciones en tiempo real.
	channel := fmt.Sprintf("support:conversation:%s", msg.ReceiverID.Hex())
	messageBytes, err := json.Marshal(msg)
	if err != nil {
		fmt.Printf("Error serializing support message: %v\n", err)
	} else {
		if err := r.redisClient.Publish(ctx, channel, messageBytes).Err(); err != nil {
			fmt.Printf("Error publishing support message: %v\n", err)
		}
	}
	return msg, nil
}

// GetMessagesBetween obtiene los mensajes intercambiados entre un usuario y un agente de soporte.
func (r *SupportRepository) GetMessagesBetween(ctx context.Context, userID, supportID string) ([]supportdomain.SupportMessage, error) {
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %v", err)
	}
	supportObjID, err := primitive.ObjectIDFromHex(supportID)
	if err != nil {
		return nil, fmt.Errorf("invalid support id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("support_messages")
	filter := bson.M{
		"$or": []bson.M{
			{"senderId": userObjID, "receiverId": supportObjID},
			{"senderId": supportObjID, "receiverId": userObjID},
		},
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get support messages: %v", err)
	}
	var messages []supportdomain.SupportMessage
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, fmt.Errorf("failed to decode support messages: %v", err)
	}
	return messages, nil
}

// MarkMessageAsRead marca un mensaje como leído.
func (r *SupportRepository) MarkMessageAsRead(ctx context.Context, messageID string) error {
	msgID, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return fmt.Errorf("invalid message id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("support_messages")
	update := bson.M{"$set": bson.M{"isRead": true}}
	res, err := collection.UpdateOne(ctx, bson.M{"_id": msgID}, update)
	if err != nil {
		return fmt.Errorf("failed to mark support message as read: %v", err)
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("support message not found")
	}
	return nil
}

// SubscribeMessages se suscribe a un canal de Redis para recibir mensajes en tiempo real.
func (r *SupportRepository) SubscribeMessages(ctx context.Context, receiverID string) *redis.PubSub {
	channel := fmt.Sprintf("support:conversation:%s", receiverID)
	return r.redisClient.Subscribe(ctx, channel)
}

// internal/support/supportinfrastructure/support_repository.go

// GetConversationsForSupport retorna todas las conversaciones (chats) en los que el agente de soporte está involucrado.
// Cada conversación agrupa los mensajes por el otro participante y ordena por la fecha del último mensaje.
func (r *SupportRepository) GetConversationsForSupport(ctx context.Context, supportID primitive.ObjectID) ([]supportdomain.Conversation, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("support_messages")

	pipeline := mongo.Pipeline{
		// Filtramos los mensajes en los que participa el agente de soporte.
		bson.D{
			{Key: "$match", Value: bson.M{
				"$or": []bson.M{
					{"senderId": supportID},
					{"receiverId": supportID},
				},
			}},
		},
		// Proyectamos un campo "User" que contenga el ID del otro participante.
		bson.D{
			{Key: "$project", Value: bson.M{
				"senderId":   1,
				"receiverId": 1,
				"text":       1,
				"createdAt":  1,
				"isRead":     1,
				"User": bson.M{
					"$cond": []interface{}{
						bson.M{"$eq": []interface{}{"$senderId", supportID}},
						"$receiverId",
						"$senderId",
					},
				},
			}},
		},
		// Lookup para obtener la información del otro usuario de la colección "Users"
		bson.D{
			{Key: "$lookup", Value: bson.M{
				"from":         "Users",
				"localField":   "User",
				"foreignField": "_id",
				"as":           "otherUserData",
			}},
		},
		// Desenrollamos el arreglo
		bson.D{
			{Key: "$unwind", Value: "$otherUserData"},
		},
		// Ordenamos de forma descendente por createdAt para obtener el mensaje más reciente primero
		bson.D{
			{Key: "$sort", Value: bson.M{"createdAt": -1}},
		},
		// Agrupamos por "User", tomando el primer mensaje (el más reciente) y la info del usuario
		bson.D{
			{Key: "$group", Value: bson.M{
				"_id":         "$User",
				"lastMessage": bson.M{"$first": "$$ROOT"},
				"User":        bson.M{"$first": "$otherUserData"},
			}},
		},
		// Ordenamos las conversaciones por la fecha del último mensaje
		bson.D{
			{Key: "$sort", Value: bson.M{"lastMessage.createdAt": -1}},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate conversations: %v", err)
	}
	defer cursor.Close(ctx)

	var conversations []supportdomain.Conversation
	if err = cursor.All(ctx, &conversations); err != nil {
		return nil, fmt.Errorf("failed to decode conversations: %v", err)
	}
	return conversations, nil
}
