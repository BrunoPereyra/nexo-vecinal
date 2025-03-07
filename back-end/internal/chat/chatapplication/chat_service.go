// internal/chat/chatapplication/chat_service.go
package chatapplication

import (
	"context"
	"fmt"

	jobdomain "back-end/internal/Job/Job-domain"
	jobinfrastructure "back-end/internal/Job/Job-infrastructure"
	"back-end/internal/chat/chatdomain"
	"back-end/internal/chat/chatinfrastructure"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatService se encarga de la lógica de negocio para el chat.
type ChatService struct {
	ChatRepo *chatinfrastructure.ChatRepository
	JobRepo  *jobinfrastructure.JobRepository // Repositorio para validar trabajos
}

// NewChatService crea una nueva instancia de ChatService.
func NewChatService(chatRepo *chatinfrastructure.ChatRepository, jobRepo *jobinfrastructure.JobRepository) *ChatService {
	return &ChatService{
		ChatRepo: chatRepo,
		JobRepo:  jobRepo,
	}
}

// SendMessage envía un mensaje. Si se incluye un JobID, se verifica que:
//   - El trabajo exista.
//   - El trabajo no esté completado.
//   - Los participantes sean el empleador (job.UserID) y el trabajador asignado (job.AssignedTo).
func (s *ChatService) SendMessage(ctx context.Context, msg chatdomain.ChatMessage) (chatdomain.ChatMessage, error) {

	job, err := s.JobRepo.GetJobDetailChat(msg.JobID)
	if job.AssignedTo != nil && job.AssignedTo.UserData != nil {
		fmt.Printf("UserData: %+v\n", *(job.AssignedTo.UserData))
	}

	if err != nil {
		return msg, fmt.Errorf("no se encontró el trabajo: %v", err)
	}
	// Verificar que el trabajo no esté completado.
	if job.Status == jobdomain.JobStatusCompleted {
		return msg, fmt.Errorf("no se puede chatear: el trabajo está completado")
	}
	// Validar que los participantes sean el empleador y el trabajador asignado.
	if job.AssignedTo.ApplicantID == primitive.NilObjectID {
		return msg, fmt.Errorf("el trabajo no tiene asignado un trabajador")
	}
	validParticipants := (job.UserID == msg.SenderID && job.AssignedTo.ApplicantID == msg.ReceiverID) ||
		(job.UserID == msg.ReceiverID && job.AssignedTo.ApplicantID == msg.SenderID)
	if !validParticipants {
		return msg, fmt.Errorf("el chat solo está permitido entre el empleador y el trabajador asignado")
	}
	// titulo de noficacion
	var fromNameUser string
	if msg.SenderID != job.AssignedTo.ApplicantID {
		fromNameUser = job.UserDetails.NameUser
	} else {
		fromNameUser = job.AssignedTo.UserData.NameUser
	}
	return s.ChatRepo.SendMessage(ctx, msg, fromNameUser)
}

// GetMessagesBetween obtiene los mensajes intercambiados entre dos usuarios.
func (s *ChatService) GetMessagesBetween(ctx context.Context, user1, user2 string) ([]chatdomain.ChatMessage, error) {
	return s.ChatRepo.GetMessagesBetween(ctx, user1, user2)
}

// MarkMessageAsRead marca un mensaje como leído.
func (s *ChatService) MarkMessageAsRead(ctx context.Context, messageID string) error {
	return s.ChatRepo.MarkMessageAsRead(ctx, messageID)
}
