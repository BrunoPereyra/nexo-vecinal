package admininterfaces

import (
	"back-end/internal/admin/adminapplication"
	"back-end/internal/admin/admindomain"
	"context"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportHandler expone los endpoints HTTP para los reportes y bloqueo de usuarios.
type ReportHandler struct {
	ReportService *adminapplication.ReportService
}

// NewReportHandler crea una nueva instancia de ReportHandler.
func NewReportHandler(service *adminapplication.ReportService) *ReportHandler {
	return &ReportHandler{
		ReportService: service,
	}
}

// CreateReport endpoint para que un usuario reporte a otro.
// Se espera en el body JSON: reportedUserId, reporterUserId y text.
func (h *ReportHandler) CreateReport(c *fiber.Ctx) error {
	var report admindomain.UserReport
	if err := c.BodyParser(&report); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	// Se obtiene el ID del usuario desde el token
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	report.ReporterUserID = userID
	// Se asume que los IDs ya están en formato ObjectID (o se convierten en el servicio)
	err = h.ReportService.CreateReport(context.Background(), report)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(report)
}

// GetReportById endpoint para obtener un reporte por su ID.
func (h *ReportHandler) GetReportById(c *fiber.Ctx) error {
	id := c.Params("id")
	report, err := h.ReportService.GetReportById(context.Background(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(report)
}

// GetReportsByUser endpoint para obtener reportes de un usuario reportado.
// Se esperan los query params: reportedUserId y order ("asc" o "desc").
func (h *ReportHandler) GetReportsByUser(c *fiber.Ctx) error {
	reportedUserId := c.Query("reportedUserId")
	order := c.Query("order", "desc")
	reports, err := h.ReportService.GetReportsByUser(context.Background(), reportedUserId, order)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reports)
}

// GetGlobalReports endpoint para obtener todos los reportes globalmente.
func (h *ReportHandler) GetGlobalReports(c *fiber.Ctx) error {
	order := c.Query("order", "desc")
	reports, err := h.ReportService.GetGlobalReports(context.Background(), order)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reports)
}

// MarkReportAsRead endpoint para marcar un reporte como leído.
// Se espera que el ID del reporte se pase en la URL.
func (h *ReportHandler) MarkReportAsRead(c *fiber.Ctx) error {
	id := c.Params("id")
	err := h.ReportService.MarkReportAsRead(context.Background(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "report marked as read"})
}

// BlockUser endpoint para bloquear a un usuario.
// Se espera en el body JSON: { "userId": "<id_del_usuario>" }.
// Además, se deben enviar en headers los datos de admin (por ejemplo, adminId y adminCode) para la autorización.
func (h *ReportHandler) BlockUser(c *fiber.Ctx) error {
	type BlockRequest struct {
		UserID string `json:"userId"`
	}
	var req BlockRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	adminID := c.Get("adminId")
	code := c.Get("adminCode")
	if err := h.ReportService.CheckAdminAuthorization(context.Background(), adminID, code); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado: " + err.Error()})
	}
	if err := h.ReportService.BlockUser(context.Background(), req.UserID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "usuario bloqueado"})
}
func (h *ReportHandler) GetAllTagsHandler(c *fiber.Ctx) error {
	ctx := context.Background()
	tags, err := h.ReportService.GetAllTags(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(tags)
}

func (h *ReportHandler) AddTagHandler(c *fiber.Ctx) error {
	var data struct {
		Tag string `json:"tag"`
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	ctx := context.Background()
	if err := h.ReportService.AddTag(ctx, data.Tag); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tag added successfully"})
}

func (h *ReportHandler) RemoveTagHandler(c *fiber.Ctx) error {
	tag := c.Params("tag")
	ctx := context.Background()
	if err := h.ReportService.RemoveTag(ctx, tag); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Tag removed successfully"})
}
