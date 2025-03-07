package chatinfrastructure

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"back-end/internal/chat/chatdomain"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ChatRepository se encarga de la persistencia de mensajes y de la publicación/subscripción en Redis.
type ChatRepository struct {
	mongoClient *mongo.Client
	redisClient *redis.Client
}

// NewChatRepository crea una nueva instancia de ChatRepository.
func NewChatRepository(mongoClient *mongo.Client, redisClient *redis.Client) *ChatRepository {
	return &ChatRepository{
		mongoClient: mongoClient,
		redisClient: redisClient,
	}
}

// SendMessage guarda un mensaje en la colección "chat_messages" y lo publica en Redis.
// Se publicará en un canal nombrado según el job, por ejemplo "chat:job:<jobID>".
func (r *ChatRepository) SendMessage(ctx context.Context, msg chatdomain.ChatMessage, nameUser string) (chatdomain.ChatMessage, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")

	// Establecer ID, fecha de creación y flag de lectura.
	msg.ID = primitive.NewObjectID()
	msg.CreatedAt = time.Now()
	msg.IsRead = false
	// Insertar en MongoDB.
	_, err := collection.InsertOne(ctx, msg)
	if err != nil {
		return chatdomain.ChatMessage{}, fmt.Errorf("failed to send message: %v", err)
	}

	// Publicar en Redis: si el mensaje tiene JobID, se usa como canal.
	if !msg.JobID.IsZero() {
		channel := fmt.Sprintf("chat:job:%s", msg.JobID.Hex())
		messageBytes, err := json.Marshal(msg)
		if err != nil {
			return chatdomain.ChatMessage{}, fmt.Errorf("error serializing message")
		} else {
			if err := r.redisClient.Publish(ctx, channel, messageBytes).Err(); err != nil {
				return chatdomain.ChatMessage{}, fmt.Errorf("error publishing message: %v\n", err)
			}
		}
	} else {
		// Opcional: si el mensaje no tiene JobID, se puede manejar de otra forma o no publicarlo.
		return chatdomain.ChatMessage{}, fmt.Errorf("mensaje sin JobID, no se publica en un canal de trabajo.")
	}
	// Luego, enviar notificación al trabajador
	if err := r.notifyMessage(msg.ReceiverID, msg.Text, nameUser); err != nil {
		return chatdomain.ChatMessage{}, errors.New("error sending push notification:")
	}
	return msg, nil
}

// GetMessagesBetween obtiene los mensajes intercambiados entre dos usuarios, ordenados por fecha.
func (r *ChatRepository) GetMessagesBetween(ctx context.Context, user1, user2 string) ([]chatdomain.ChatMessage, error) {
	user1ID, err := primitive.ObjectIDFromHex(user1)
	if err != nil {
		return nil, fmt.Errorf("invalid user1 id: %v", err)
	}
	user2ID, err := primitive.ObjectIDFromHex(user2)
	if err != nil {
		return nil, fmt.Errorf("invalid user2 id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")
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
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")
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

// SubscribeMessages se subscribe a un canal específico basado en el JobID.
// Por ejemplo, si jobID es "123", se suscribe al canal "chat:job:123".
func (r *ChatRepository) SubscribeMessages(ctx context.Context, jobID string) *redis.PubSub {
	channel := fmt.Sprintf("chat:job:%s", jobID)
	return r.redisClient.Subscribe(ctx, channel)
}
func (j *ChatRepository) notifyMessage(user primitive.ObjectID, jobTitle, nameUser string) error {
	// Supongamos que tienes una función que obtiene el push token del usuario
	pushToken, err := j.getPushTokenUser(user)
	if err != nil {
		return err
	}
	// Construir payload para notificación push de Expo
	payload := map[string]interface{}{
		"to":    pushToken,
		"title": nameUser,
		"body":  jobTitle,
		"data":  map[string]string{"jobTitle": jobTitle},
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	// Enviar la notificación push
	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("error enviando notificación, status: %d", resp.StatusCode)
	}
	return nil
}
func (j *ChatRepository) getPushTokenUser(workerID primitive.ObjectID) (string, error) {
	userColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var user struct {
		PushToken string `bson:"pushToken"`
	}
	filter := bson.M{"_id": workerID}
	err := userColl.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return "", err
	}
	if user.PushToken == "" {
		return "", errors.New("el trabajador no tiene push token")
	}
	return user.PushToken, nil
}
