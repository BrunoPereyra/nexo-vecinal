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

// ChatRepository se encarga de la persistencia de chats y mensajes, y de la publicación/subscripción en Redis.
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
func (r *ChatRepository) SendMessage(ctx context.Context, msg chatdomain.ChatMessage, senderName string) (chatdomain.ChatMessage, error) {
	// Obtener o crear ChatRoom entre sender y receiver usando el arreglo "participants".
	chatRoom, err := r.findOrCreateChatRoom(ctx, msg.SenderID, msg.ReceiverID)
	if err != nil {
		return chatdomain.ChatMessage{}, err
	}
	msg.ChatRoomID = chatRoom.ID

	// Establecer ID, fecha de creación y flag de lectura.
	msg.ID = primitive.NewObjectID()
	msg.CreatedAt = time.Now()
	msg.IsRead = false

	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")
	_, err = collection.InsertOne(ctx, msg)
	if err != nil {
		return chatdomain.ChatMessage{}, fmt.Errorf("error insertando mensaje: %v", err)
	}

	// Publicar en Redis en el canal "chat:room:<chatRoomID>"
	channel := fmt.Sprintf("chat:room:%s", chatRoom.ID.Hex())
	messageBytes, err := json.Marshal(msg)
	if err != nil {
		return chatdomain.ChatMessage{}, fmt.Errorf("error serializando mensaje: %v", err)
	}
	if err := r.redisClient.Publish(ctx, channel, messageBytes).Err(); err != nil {
		return chatdomain.ChatMessage{}, fmt.Errorf("error publicando mensaje: %v", err)
	}

	// Enviar notificación push al receptor.
	if err := r.notifyMessage(msg.ReceiverID, msg.Text, senderName); err != nil {
		return chatdomain.ChatMessage{}, errors.New("error enviando notificación push")
	}
	return msg, nil
}

// GetMessagesBetween obtiene los mensajes intercambiados entre dos usuarios.
func (r *ChatRepository) GetMessagesBetween(ctx context.Context, user1, user2 string) ([]chatdomain.ChatMessage, error) {
	// Convertir IDs.
	u1, err := primitive.ObjectIDFromHex(user1)
	if err != nil {
		return nil, fmt.Errorf("user1 inválido: %v", err)
	}
	u2, err := primitive.ObjectIDFromHex(user2)
	if err != nil {
		return nil, fmt.Errorf("user2 inválido: %v", err)
	}
	// Obtener el ChatRoom correspondiente.
	chatRoom, err := r.findOrCreateChatRoom(ctx, u1, u2)
	if err != nil {
		return nil, err
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")
	filter := bson.M{"chatRoomId": chatRoom.ID}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo mensajes: %v", err)
	}
	var messages []chatdomain.ChatMessage
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, fmt.Errorf("error decodificando mensajes: %v", err)
	}
	return messages, nil
}

// MarkMessageAsRead marca un mensaje como leído.
func (r *ChatRepository) MarkMessageAsRead(ctx context.Context, messageID string) error {
	msgID, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return fmt.Errorf("mensaje id inválido: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_messages")
	update := bson.M{"$set": bson.M{"isRead": true}}
	res, err := collection.UpdateOne(ctx, bson.M{"_id": msgID}, update)
	if err != nil {
		return fmt.Errorf("error al marcar mensaje como leído: %v", err)
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("mensaje no encontrado")
	}
	return nil
}

// SubscribeMessages se subscribe a un canal específico basado en el ChatRoomID.
func (r *ChatRepository) SubscribeMessages(ctx context.Context, chatRoomID string) *redis.PubSub {
	channel := fmt.Sprintf("chat:room:%s", chatRoomID)
	return r.redisClient.Subscribe(ctx, channel)
}

// BlockUser agrega el ID del usuario que bloquea al campo BlockedBy del ChatRoom.
func (r *ChatRepository) BlockUser(ctx context.Context, chatRoomID, blockerID string) error {
	roomID, err := primitive.ObjectIDFromHex(chatRoomID)
	if err != nil {
		return fmt.Errorf("chatRoomID inválido: %v", err)
	}
	userID, err := primitive.ObjectIDFromHex(blockerID)
	if err != nil {
		return fmt.Errorf("blockerID inválido: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	update := bson.M{"$addToSet": bson.M{"blockedBy": userID}, "$set": bson.M{"updatedAt": time.Now()}}
	_, err = collection.UpdateByID(ctx, roomID, update)
	return err
}

func (r *ChatRepository) notifyMessage(user primitive.ObjectID, messageText, senderName string) error {
	pushToken, err := r.getPushTokenUser(user)
	if err != nil {
		return err
	}
	payload := map[string]interface{}{
		"to":    pushToken,
		"title": senderName,
		"body":  messageText,
		"data":  map[string]string{"message": messageText},
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
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

func (r *ChatRepository) getPushTokenUser(userID primitive.ObjectID) (string, error) {
	userColl := r.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var user struct {
		PushToken string `bson:"pushToken"`
	}
	filter := bson.M{"_id": userID}
	err := userColl.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return "", err
	}
	if user.PushToken == "" {
		return "", errors.New("el usuario no tiene push token")
	}
	return user.PushToken, nil
}

// GetOrCreateChatRoom utiliza "participantsKey" para asegurar la unicidad de la combinación completa.
func (r *ChatRepository) GetOrCreateChatRoom(ctx context.Context, user1, user2 primitive.ObjectID) (chatdomain.ChatRoom, error) {
	if user1 == user2 {
		return chatdomain.ChatRoom{}, errors.New("no puedes chatear contigo mismo")
	}

	var participants []primitive.ObjectID
	if user1.Hex() < user2.Hex() {
		participants = []primitive.ObjectID{user1, user2}
	} else {
		participants = []primitive.ObjectID{user2, user1}
	}

	// Generamos la clave compuesta ordenada.
	participantsKey := participants[0].Hex() + "_" + participants[1].Hex()

	filter := bson.M{"participantsKey": participantsKey}

	update := bson.M{
		"$setOnInsert": bson.M{
			"participants":    participants,
			"participantsKey": participantsKey,
			"createdAt":       time.Now(),
		},
		"$set": bson.M{
			"updatedAt": time.Now(),
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	var room chatdomain.ChatRoom
	err := collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&room)
	if err != nil {
		return chatdomain.ChatRoom{}, err
	}
	return room, nil
}

// findOrCreateChatRoom es similar y se usa internamente.
func (r *ChatRepository) findOrCreateChatRoom(ctx context.Context, user1, user2 primitive.ObjectID) (chatdomain.ChatRoom, error) {
	if user1 == user2 {
		return chatdomain.ChatRoom{}, errors.New("no puedes chatear contigo mismo")
	}

	var participants []primitive.ObjectID
	if user1.Hex() < user2.Hex() {
		participants = []primitive.ObjectID{user1, user2}
	} else {
		participants = []primitive.ObjectID{user2, user1}
	}

	participantsKey := participants[0].Hex() + "_" + participants[1].Hex()

	filter := bson.M{"participantsKey": participantsKey}

	update := bson.M{
		"$setOnInsert": bson.M{
			"participants":    participants,
			"participantsKey": participantsKey,
			"createdAt":       time.Now(),
		},
		"$set": bson.M{
			"updatedAt": time.Now(),
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	var room chatdomain.ChatRoom
	err := collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&room)
	if err != nil {
		return chatdomain.ChatRoom{}, err
	}
	return room, nil
}

func (r *ChatRepository) GetChatRooms(ctx context.Context, userID primitive.ObjectID, limit int, skip int) ([]chatdomain.ChatDetails, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	pipeline := mongo.Pipeline{
		{{
			Key: "$match", Value: bson.M{
				"participants": bson.M{"$in": []primitive.ObjectID{userID}},
			},
		}},
		{{
			Key: "$addFields", Value: bson.M{
				"otherParticipant": bson.M{
					"$arrayElemAt": bson.A{
						bson.M{"$filter": bson.M{
							"input": "$participants",
							"as":    "participant",
							"cond":  bson.M{"$ne": []interface{}{"$$participant", userID}},
						}}, 0,
					},
				},
			},
		}},
		{{
			Key: "$lookup", Value: bson.M{
				"from":         "Users",
				"localField":   "otherParticipant",
				"foreignField": "_id",
				"as":           "otherUserDetails",
			},
		}},
		{{
			Key: "$addFields", Value: bson.M{
				"otherUser": bson.M{
					"$arrayElemAt": bson.A{"$otherUserDetails", 0},
				},
			},
		}},
		{{
			Key: "$project", Value: bson.M{
				"_id":                1,
				"participants":       1,
				"updatedAt":          1,
				"otherUser._id":      1,
				"otherUser.NameUser": 1,
				"otherUser.Avatar":   1,
			},
		}},
		{{
			Key: "$sort", Value: bson.D{{Key: "updatedAt", Value: -1}},
		}},
		{{
			Key: "$skip", Value: 0,
		}},
		{{
			Key: "$limit", Value: 10,
		}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("error al obtener chat rooms: %v", err)
	}
	defer cursor.Close(ctx)

	var chatRooms []chatdomain.ChatDetails
	if err = cursor.All(ctx, &chatRooms); err != nil {
		return nil, fmt.Errorf("error al decodificar chat rooms: %v", err)
	}
	return chatRooms, nil
}
