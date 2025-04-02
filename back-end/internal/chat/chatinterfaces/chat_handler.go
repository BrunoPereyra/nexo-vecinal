// internal/chat/chatinterfaces/chat_handler.go
package chatinterfaces

import (
	"back-end/internal/chat/chatapplication"
	"back-end/internal/chat/chatdomain"
	"context"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatHandler expone los endpoints para las operaciones de chat.
type ChatHandler struct {
	ChatService *chatapplication.ChatService
}

// NewChatHandler crea una nueva instancia de ChatHandler.
func NewChatHandler(service *chatapplication.ChatService) *ChatHandler {
	return &ChatHandler{
		ChatService: service,
	}
}

// GetChatRoom endpoint para obtener o crear un ChatRoom.
// Se toma el ID del usuario autenticado (Participant1) desde useExtractor y se recibe el partner via query.
func (h *ChatHandler) GetChatRoom(c *fiber.Ctx) error {
	// Se obtiene el ID del usuario autenticado desde useExtractor.
	idValue := c.Context().UserValue("_id").(string)
	// Se espera que el partner venga en la query.
	partnerID := c.Query("partner")
	if idValue == "" || partnerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El usuario y el partner son requeridos"})
	}

	room, err := h.ChatService.GetChatRoom(c.Context(), idValue, partnerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(room)
}

// SendMessage endpoint para enviar un mensaje (POST /chat/messages).
// Se espera en el body JSON: senderId, receiverId y text.
func (h *ChatHandler) SendMessage(c *fiber.Ctx) error {
	nameuser := c.Context().UserValue("nameUser").(string)
	var msg chatdomain.ChatMessage
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}

	// Convertir senderId si es necesario.
	if msg.SenderID.IsZero() {
		senderStr := c.FormValue("senderId")
		senderID, err := primitive.ObjectIDFromHex(senderStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "senderId inválido"})
		}
		msg.SenderID = senderID
	}

	// Convertir receiverId si es necesario.
	if msg.ReceiverID.IsZero() {
		receiverStr := c.FormValue("receiverId")
		receiverID, err := primitive.ObjectIDFromHex(receiverStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "receiverId inválido"})
		}
		msg.ReceiverID = receiverID
	}

	savedMsg, err := h.ChatService.SendMessage(context.Background(), msg, nameuser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error interno",
			"data":    err.Error(),
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Mensaje enviado",
		"data":    savedMsg,
	})
}

// GetMessagesBetween endpoint para obtener mensajes entre dos usuarios (GET /chat/messages?user1=...&user2=...).
func (h *ChatHandler) GetMessagesBetween(c *fiber.Ctx) error {
	user1 := c.Query("user1")
	user2 := c.Query("user2")
	if user1 == "" || user2 == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user1 y user2 son requeridos"})
	}
	messages, err := h.ChatService.GetMessagesBetween(context.Background(), user1, user2)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(messages)
}

// MarkMessageAsRead endpoint para marcar un mensaje como leído (POST /chat/messages/:id/read).
func (h *ChatHandler) MarkMessageAsRead(c *fiber.Ctx) error {
	messageID := c.Params("id")
	if messageID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message id es requerido"})
	}
	err := h.ChatService.MarkMessageAsRead(context.Background(), messageID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "mensaje marcado como leído"})
}

func (h *ChatHandler) SubscribeMessages(c *websocket.Conn) {
	chatRoomID := c.Params("chatRoomId")
	if chatRoomID == "" {
		c.WriteMessage(websocket.TextMessage, []byte("chatRoomId es requerido"))
		return
	}

	ctx := context.Background()
	pubsub := h.ChatService.ChatRepo.SubscribeMessages(ctx, chatRoomID)
	defer pubsub.Close()

	// Canal para detectar cuando el cliente cierra la conexión
	closed := make(chan struct{})

	// Goroutine para escuchar si el cliente cierra la conexión
	go func() {
		defer close(closed)
		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	// Loop principal para recibir mensajes de Redis y enviarlos al cliente
	for {
		select {
		case <-closed:
			return
		default:
			msg, err := pubsub.ReceiveMessage(ctx)
			if err != nil {
				return
			}
			if err := c.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
				return
			}
		}
	}
}

// BlockChat endpoint para bloquear un chat (POST /chat/block).
// Se espera en el body JSON: chatRoomId y blockerId.
func (h *ChatHandler) BlockChat(c *fiber.Ctx) error {
	var payload struct {
		ChatRoomID string `json:"chatRoomId"`
		BlockerID  string `json:"blockerId"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	if payload.ChatRoomID == "" || payload.BlockerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "chatRoomId y blockerId son requeridos"})
	}
	err := h.ChatService.BlockUser(context.Background(), payload.ChatRoomID, payload.BlockerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "chat bloqueado"})
}

// internal/chat/chatinterfaces/chat_handler.go

// GetChatRooms endpoint para obtener los chat rooms paginados (GET /chat/rooms).
// Se espera que el usuario autenticado venga en el contexto (useExtractor)
// y que se reciban query parameters: limit y page (opcional, page por defecto 1).
func (h *ChatHandler) GetChatRooms(c *fiber.Ctx) error {
	// Obtenemos el userID del usuario autenticado
	idValue := c.Context().UserValue("_id").(string)
	if idValue == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "userID requerido"})
	}

	// Obtenemos el límite y la página de la query
	pageParam := c.Query("page", "1")

	page, err := strconv.Atoi(pageParam)
	if err != nil || page <= 0 {
		page = 1
	}

	rooms, err := h.ChatService.GetChatRooms(c.Context(), idValue, 10, page)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(rooms)
}
