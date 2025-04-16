package reportsapplication

import (
	"back-end/internal/reports/reportsdomain"
	reportsinfrastructure "back-end/internal/reports/reportsnfrastructure"
	"context"
)

// ReportService contiene la lógica de negocio para reportes y bloqueo.
type ReportService struct {
	ReportRepository *reportsinfrastructure.ReportRepository
}

// NewReportService crea una nueva instancia de ReportService.
func NewReportService(repo *reportsinfrastructure.ReportRepository) *ReportService {
	return &ReportService{
		ReportRepository: repo,
	}
}

// CreateReport crea un reporte de usuario.
func (s *ReportService) CreateReport(ctx context.Context, report reportsdomain.UserReport) error {
	return s.ReportRepository.CreateReport(ctx, report)
}

// GetReportById recupera un reporte por su ID.
func (s *ReportService) GetReportById(ctx context.Context, id string) (*reportsdomain.UserReport, error) {
	return s.ReportRepository.GetReportById(ctx, id)
}

// GetReportsByUser recupera reportes para un usuario reportado, con el orden indicado.
func (s *ReportService) GetReportsByUser(ctx context.Context, reportedUserID string, order string) ([]reportsdomain.UserReport, error) {
	return s.ReportRepository.GetReportsByUser(ctx, reportedUserID, order)
}

// GetGlobalReports recupera todos los reportes en el orden indicado.
func (s *ReportService) GetGlobalReports(ctx context.Context, order string) ([]reportsdomain.UserReportResponse, error) {
	return s.ReportRepository.GetGlobalReports(ctx, order)
}

// MarkReportAsRead marca un reporte como leído.
func (s *ReportService) MarkReportAsRead(ctx context.Context, reportID string) error {
	return s.ReportRepository.MarkReportAsRead(ctx, reportID)
}
