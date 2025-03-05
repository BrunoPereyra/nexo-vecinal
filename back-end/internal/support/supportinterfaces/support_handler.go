// internal/support/supportinterfaces/support_handler.go
package supportinterfaces

import (
	"back-end/internal/support/supportapplication"
	"back-end/internal/support/supportdomain"
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SupportHandler expone los endpoints para operaciones del chat de soporte.
type SupportHandler struct {
	SupportService *supportapplication.SupportService
}

// NewSupportHandler crea una nueva instancia de SupportHandler.
func NewSupportHandler(service *supportapplication.SupportService) *SupportHandler {
	return &SupportHandler{
		SupportService: service,
	}
}

// SendSupportMessage endpoint para enviar un mensaje de soporte.
// Se espera en el body JSON: senderId, receiverId, text y opcionalmente "code" para autorización.
func (h *SupportHandler) SendSupportMessage(c *fiber.Ctx) error {
	var msg supportdomain.SupportMessage
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	msg.SenderID = IdUserTokenP

	// Obtener el código para la autorización (si corresponde)
	code := c.FormValue("code")
	err := h.SupportService.SendMessage(context.Background(), msg, code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "mensaje enviado"})
}

// GetSupportMessages endpoint para obtener los mensajes entre un usuario y un agente de soporte.
func (h *SupportHandler) GetSupportMessages(c *fiber.Ctx) error {
	userID := c.Query("user")
	supportID := c.Query("support")
	if userID == "" || supportID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user y support son requeridos"})
	}
	messages, err := h.SupportService.GetMessagesBetween(context.Background(), userID, supportID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(messages)
}

// MarkSupportMessageAsRead endpoint para marcar un mensaje como leído.
func (h *SupportHandler) MarkSupportMessageAsRead(c *fiber.Ctx) error {
	messageID := c.Params("id")
	if messageID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message id es requerido"})
	}
	err := h.SupportService.MarkMessageAsRead(context.Background(), messageID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "mensaje marcado como leído"})
}

// SubscribeSupportMessages endpoint para suscribirse a mensajes en tiempo real vía WebSocket.
func (h *SupportHandler) SubscribeSupportMessages(c *websocket.Conn) {
	supportID := c.Params("supportID")
	if supportID == "" {
		c.WriteMessage(websocket.TextMessage, []byte("supportID es requerido"))
		return
	}

	ctx := context.Background()
	pubsub := h.SupportService.SupportRepo.SubscribeMessages(ctx, supportID)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			break
		}
		if err := c.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
			break
		}
	}
}

//

func (h *SupportHandler) GetSupportAgent(c *fiber.Ctx) error {
	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	user, err := h.SupportService.GetSupportAgent(context.Background(), IdUserTokenP)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Agent",
		"supportAgent": user,
	})
}
func (h *SupportHandler) GetConversationsForSupport(c *fiber.Ctx) error {
	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	convs, err := h.SupportService.GetConversationsForSupport(c.Context(), IdUserTokenP)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(convs)
}
