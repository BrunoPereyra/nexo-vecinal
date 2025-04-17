package adminapplication

import (
	"context"

	"back-end/internal/admin/admindomain"
	"back-end/internal/admin/admininfrastructure"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportService contiene la lógica de negocio para reportes y bloqueo.
type ReportService struct {
	ReportRepository *admininfrastructure.ReportRepository
}

// NewReportService crea una nueva instancia de ReportService.
func NewReportService(repo *admininfrastructure.ReportRepository) *ReportService {
	return &ReportService{
		ReportRepository: repo,
	}
}

// CreateReport crea un reporte de usuario.
func (s *ReportService) CreateReport(ctx context.Context, report admindomain.UserReport) error {
	return s.ReportRepository.CreateReport(ctx, report)
}

// GetReportById recupera un reporte por su ID.
func (s *ReportService) GetReportById(ctx context.Context, id string) (*admindomain.UserReport, error) {
	return s.ReportRepository.GetReportById(ctx, id)
}

// GetReportsByUser recupera reportes para un usuario reportado, con el orden indicado.
func (s *ReportService) GetReportsByUser(ctx context.Context, reportedUserID string, order string) ([]admindomain.UserReport, error) {
	return s.ReportRepository.GetReportsByUser(ctx, reportedUserID, order)
}

// GetGlobalReports recupera todos los reportes en el orden indicado.
func (s *ReportService) GetGlobalReports(ctx context.Context, order string) ([]admindomain.UserReportResponse, error) {
	return s.ReportRepository.GetGlobalReports(ctx, order)
}

// MarkReportAsRead marca un reporte como leído.
func (s *ReportService) MarkReportAsRead(ctx context.Context, reportID string) error {
	return s.ReportRepository.MarkReportAsRead(ctx, reportID)
}

// BlockUser bloquea a un usuario.
func (s *ReportService) BlockUser(ctx context.Context, userID string) error {
	return s.ReportRepository.BlockUser(ctx, userID)
}

// CheckAdminAuthorization valida que el solicitante sea administrador.
func (s *ReportService) CheckAdminAuthorization(ctx context.Context, adminID string, code string) error {
	return s.ReportRepository.CheckAdminAuthorization(ctx, adminID, code)
}
func (s *ReportService) GetAllTags(ctx context.Context) ([]string, error) {
	return s.ReportRepository.GetAllTags(ctx)
}

func (s *ReportService) AddTag(ctx context.Context, tag string) error {
	return s.ReportRepository.AddTag(ctx, tag)
}

func (s *ReportService) RemoveTag(ctx context.Context, tag string) error {
	return s.ReportRepository.RemoveTag(ctx, tag)
}

// BlockUser bloquea a un usuario.
func (s *ReportService) DeleteJob(ctx context.Context, userID string) error {
	return s.ReportRepository.DeleteJob(ctx, userID)
}

// BlockUser bloquea a un usuario.
func (s *ReportService) DeletePost(ctx context.Context, userID primitive.ObjectID) error {
	return s.ReportRepository.DeletePost(ctx, userID)
}

// BlockUser bloquea a un usuario.
func (s *ReportService) CreateOrUpdateContentReport(req admindomain.ReportDetailReq, userId primitive.ObjectID) error {
	ctx := context.Background()
	return s.ReportRepository.CreateOrUpdateContentReport(ctx, req, userId)
}

func (s *ReportService) GetContentReports(ctx context.Context, page int) ([]admindomain.ContentReport, error) {
	return s.ReportRepository.GetContentReports(ctx, page)
}

func (s *ReportService) DeleteContentReport(ctx context.Context, report primitive.ObjectID) error {
	return s.ReportRepository.DeleteContentReport(ctx, report)
}
