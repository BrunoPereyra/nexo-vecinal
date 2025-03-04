// internal/support/supportapplication/support_service.go
package supportapplication

import (
	"context"
	"fmt"

	"back-end/internal/support/supportdomain"
	supportinfrastructure "back-end/internal/support/supportinfrastructure"
	userdomain "back-end/internal/user/user-domain"
	userinfrastructure "back-end/internal/user/user-infrastructure"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SupportService gestiona la lógica de negocio del chat de soporte.
type SupportService struct {
	SupportRepo *supportinfrastructure.SupportRepository
	UserRepo    *userinfrastructure.UserRepository
}

// NewSupportService crea una nueva instancia de SupportService.
func NewSupportService(supportRepo *supportinfrastructure.SupportRepository, userRepo *userinfrastructure.UserRepository) *SupportService {
	return &SupportService{
		SupportRepo: supportRepo,
		UserRepo:    userRepo,
	}
}

// SendMessage envía un mensaje de soporte. Valida que:
// - Si el remitente es agente de soporte, se debe autorizar con código y nivel 2.
// - Si el remitente es un usuario, se verifica que el destinatario sea un agente de soporte activo.
func (s *SupportService) SendMessage(ctx context.Context, msg supportdomain.SupportMessage, code string) (supportdomain.SupportMessage, error) {
	senderID := msg.SenderID
	receiverID := msg.ReceiverID

	// Verificar si el remitente es un agente de soporte.
	isSenderSupport, err := s.UserRepo.IsSupportAgent(ctx, senderID)
	if err != nil {
		return msg, fmt.Errorf("error verificando soporte del remitente: %v", err)
	}
	if isSenderSupport {
		// Agente de soporte: se requiere autorización con código y nivel 2.
		if err := s.UserRepo.AutCodeSupport(senderID, code); err != nil {
			return msg, fmt.Errorf("soporte no autorizado: %v", err)
		}
	} else {
		// Remitente es un usuario: se verifica que el receptor sea agente de soporte activo.
		receiverID, err = s.UserRepo.AssignSupportAgent(ctx, senderID)

		if err != nil {

			return msg, fmt.Errorf("error buscando agente de soporte: %v", err)
		}

		isReceiverSupport, err := s.UserRepo.IsSupportAgent(ctx, receiverID)
		if err != nil {
			return msg, fmt.Errorf("error verificando soporte del destinatario: %v", err)
		}
		if !isReceiverSupport {
			return msg, fmt.Errorf("el destinatario no es un agente de soporte")
		}
	}
	msg.ReceiverID = receiverID
	return s.SupportRepo.SendMessage(ctx, msg)
}

// GetMessagesBetween obtiene los mensajes entre un usuario y un agente de soporte.
func (s *SupportService) GetMessagesBetween(ctx context.Context, userID, supportID string) ([]supportdomain.SupportMessage, error) {
	return s.SupportRepo.GetMessagesBetween(ctx, userID, supportID)
}

// MarkMessageAsRead marca un mensaje como leído.
func (s *SupportService) MarkMessageAsRead(ctx context.Context, messageID string) error {
	return s.SupportRepo.MarkMessageAsRead(ctx, messageID)
}

// MarkMessageAsRead marca un mensaje como leído.
func (s *SupportService) GetSupportAgent(ctx context.Context, id primitive.ObjectID) (*userdomain.User, error) {
	return s.UserRepo.GetSupportAgent(ctx, id)
}

// GetConversationsForSupport retorna todas las conversaciones para el agente de soporte.
func (s *SupportService) GetConversationsForSupport(ctx context.Context, supportID primitive.ObjectID) ([]supportdomain.Conversation, error) {
	return s.SupportRepo.GetConversationsForSupport(ctx, supportID)
}
