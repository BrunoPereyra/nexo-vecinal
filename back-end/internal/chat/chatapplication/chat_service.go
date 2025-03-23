// internal/chat/chatapplication/chat_service.go
package chatapplication

import (
	"context"
	"fmt"

	"back-end/internal/chat/chatdomain"
	"back-end/internal/chat/chatinfrastructure"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatService se encarga de la lógica de negocio del chat.
type ChatService struct {
	ChatRepo *chatinfrastructure.ChatRepository
}

// NewChatService crea una nueva instancia de ChatService.
func NewChatService(chatRepo *chatinfrastructure.ChatRepository) *ChatService {
	return &ChatService{
		ChatRepo: chatRepo,
	}
}

// SendMessage envía un mensaje entre dos usuarios.
// Se espera que en msg se tenga senderId, receiverId y text.
func (s *ChatService) SendMessage(ctx context.Context, msg chatdomain.ChatMessage) (chatdomain.ChatMessage, error) {
	// Ejemplo de validación: Si el chat está bloqueado por el emisor, se rechaza el envío.
	// (La verificación se puede hacer obteniendo el ChatRoom y comprobando si msg.SenderID se encuentra en BlockedBy).
	// Aquí se asume que dicha validación se implementa en el repositorio o previamente.

	// Para notificaciones, se define el nombre del remitente (este ejemplo es simple; ajusta según convenga).
	senderName := "Remitente" // O bien, obtenerlo de la base de datos

	return s.ChatRepo.SendMessage(ctx, msg, senderName)
}

// GetMessagesBetween obtiene los mensajes intercambiados entre dos usuarios.
func (s *ChatService) GetMessagesBetween(ctx context.Context, user1, user2 string) ([]chatdomain.ChatMessage, error) {
	return s.ChatRepo.GetMessagesBetween(ctx, user1, user2)
}

// MarkMessageAsRead marca un mensaje como leído.
func (s *ChatService) MarkMessageAsRead(ctx context.Context, messageID string) error {
	return s.ChatRepo.MarkMessageAsRead(ctx, messageID)
}

// BlockUser en un chat, agregando al usuario que bloquea.
func (s *ChatService) BlockUser(ctx context.Context, chatRoomID, blockerID string) error {
	return s.ChatRepo.BlockUser(ctx, chatRoomID, blockerID)
}

// GetChatRoom obtiene o crea un ChatRoom entre dos usuarios.
func (s *ChatService) GetChatRoom(ctx context.Context, userId, partnerId string) (chatdomain.ChatRoom, error) {
	u1, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return chatdomain.ChatRoom{}, err
	}
	u2, err := primitive.ObjectIDFromHex(partnerId)
	if err != nil {
		return chatdomain.ChatRoom{}, err
	}
	return s.ChatRepo.GetOrCreateChatRoom(ctx, u1, u2)
}

// internal/chat/chatapplication/chat_service.go

// GetChatRooms obtiene los chats del usuario, paginados.
// page comienza en 1. skip = (page - 1) * limit.
func (s *ChatService) GetChatRooms(ctx context.Context, userID string, limit, page int) ([]chatdomain.ChatDetails, error) {
	uID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("userID inválido: %v", err)
	}
	skip := (page - 1) * limit
	return s.ChatRepo.GetChatRooms(ctx, uID, limit, skip)
}
