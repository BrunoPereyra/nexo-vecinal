// internal/chat/chatinterfaces/chat_handler.go
package chatinterfaces

import (
	"back-end/internal/chat/chatapplication"
	"back-end/internal/chat/chatdomain"
	"context"

	"github.com/gofiber/fiber/v2"
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

// SendMessage endpoint para enviar un mensaje (POST /chat/messages).
// Se espera en el body JSON: senderId, receiverId, text y opcionalmente jobId.
func (h *ChatHandler) SendMessage(c *fiber.Ctx) error {
	var msg chatdomain.ChatMessage
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}

	// Convertir senderId si es necesario
	if msg.SenderID.IsZero() {
		senderStr := c.FormValue("senderId")
		senderID, err := primitive.ObjectIDFromHex(senderStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "senderId inválido"})
		}
		msg.SenderID = senderID
	}

	// Convertir receiverId si es necesario
	if msg.ReceiverID.IsZero() {
		receiverStr := c.FormValue("receiverId")
		receiverID, err := primitive.ObjectIDFromHex(receiverStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "receiverId inválido"})
		}
		msg.ReceiverID = receiverID
	}

	// Convertir jobId si se envía
	jobIdStr := c.FormValue("jobId")
	if jobIdStr != "" {
		jobID, err := primitive.ObjectIDFromHex(jobIdStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "jobId inválido"})
		}
		msg.JobID = jobID
	}

	err := h.ChatService.SendMessage(context.Background(), msg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(msg)
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
