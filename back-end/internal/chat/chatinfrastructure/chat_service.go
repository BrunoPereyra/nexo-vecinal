// internal/chat/chatinfrastructure/chat_repository.go
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

// findOrCreateChatRoom busca un ChatRoom entre dos usuarios o lo crea si no existe.
func (r *ChatRepository) findOrCreateChatRoom(ctx context.Context, user1, user2 primitive.ObjectID) (chatdomain.ChatRoom, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	// Buscar sin importar el orden de los participantes.
	filter := bson.M{
		"$or": []bson.M{
			{"participant1": user1, "participant2": user2},
			{"participant1": user2, "participant2": user1},
		},
	}
	var room chatdomain.ChatRoom
	err := collection.FindOne(ctx, filter).Decode(&room)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Crear un nuevo ChatRoom.
			room = chatdomain.ChatRoom{
				ID:           primitive.NewObjectID(),
				Participant1: user1,
				Participant2: user2,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			_, err = collection.InsertOne(ctx, room)
			if err != nil {
				return chatdomain.ChatRoom{}, fmt.Errorf("error creando chat room: %v", err)
			}
			return room, nil
		}
		return chatdomain.ChatRoom{}, err
	}
	return room, nil
}

// SendMessage guarda un mensaje en la colección "chat_messages" y lo publica en Redis.
func (r *ChatRepository) SendMessage(ctx context.Context, msg chatdomain.ChatMessage, senderName string) (chatdomain.ChatMessage, error) {
	// Obtener o crear ChatRoom entre sender y receiver.
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
// Por ejemplo, para chatRoomID "123", se suscribe al canal "chat:room:123".
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
	// Se asume que existe una función para obtener el token de push del usuario.
	pushToken, err := r.getPushTokenUser(user)
	if err != nil {
		return err
	}
	// Construir payload para notificación push (se utiliza Expo).
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
func (r *ChatRepository) GetOrCreateChatRoom(ctx context.Context, user1, user2 primitive.ObjectID) (chatdomain.ChatRoom, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")
	filter := bson.M{
		"$or": []bson.M{
			{"participant1": user1, "participant2": user2},
			{"participant1": user2, "participant2": user1},
		},
	}
	var room chatdomain.ChatRoom
	err := collection.FindOne(ctx, filter).Decode(&room)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// El primer que solicita abrir el chat se registra como Participant1
			room = chatdomain.ChatRoom{
				ID:           primitive.NewObjectID(),
				Participant1: user1,
				Participant2: user2,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			_, err = collection.InsertOne(ctx, room)
			if err != nil {
				return chatdomain.ChatRoom{}, err
			}
			return room, nil
		}
		return chatdomain.ChatRoom{}, err
	}
	return room, nil
}

// GetChatRooms obtiene los ChatRooms del usuario, paginados.
func (r *ChatRepository) GetChatRooms(ctx context.Context, userID primitive.ObjectID, limit int, skip int) ([]chatdomain.ChatDetails, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("chat_rooms")

	pipeline := mongo.Pipeline{
		// 1. Filtrar los chats donde el usuario es participante
		{{
			Key: "$match", Value: bson.M{
				"$or": []bson.M{
					{"participant1": userID},
					{"participant2": userID},
				},
			},
		}},
		// 2. Determinar el otro participante
		{{
			Key: "$addFields", Value: bson.M{
				"otherParticipant": bson.M{
					"$cond": bson.M{
						"if":   bson.M{"$eq": bson.A{"$participant1", userID}},
						"then": "$participant2",
						"else": "$participant1",
					},
				},
			},
		}},
		// 3. Lookup para obtener detalles del otro participante
		{{
			Key: "$lookup", Value: bson.M{
				"from":         "Users",
				"localField":   "otherParticipant",
				"foreignField": "_id",
				"as":           "otherUserDetails",
			},
		}},
		// 4. Extraer los detalles del usuario en una sola estructura
		{{
			Key: "$addFields", Value: bson.M{
				"otherUser": bson.M{
					"$arrayElemAt": bson.A{"$otherUserDetails", 0},
				},
			},
		}},
		// 5. Proyectar solo los campos necesarios
		{{
			Key: "$project", Value: bson.M{
				"_id":                1,
				"participant1":       1,
				"participant2":       1,
				"updatedAt":          1,
				"otherUser._id":      1,
				"otherUser.NameUser": 1,
				"otherUser.Avatar":   1,
			},
		}},
		// 6. Ordenar por fecha de actualización (más recientes primero)
		{{
			Key: "$sort", Value: bson.D{{Key: "updatedAt", Value: -1}},
		}},
		// 7. Aplicar paginación
		{{
			Key: "$skip", Value: skip,
		}},
		{{
			Key: "$limit", Value: limit,
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
