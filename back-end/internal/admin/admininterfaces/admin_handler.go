package admininterfaces

import (
	"back-end/internal/admin/adminapplication"
	"back-end/internal/admin/admindomain"
	"context"
	"strconv"

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
func (h *ReportHandler) CreateOrUpdateContentReport(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	var req admindomain.ReportDetailReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err})
	}
	err = h.ReportService.CreateOrUpdateContentReport(req, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Reporte creado o actualizado correctamente"})
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
func (h *ReportHandler) DeleteJob(c *fiber.Ctx) error {
	type request struct {
		JobId     string `json:"JobId"`
		AdminCode string `json:"AdminCode"`
	}
	var req request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	idValue := c.Context().UserValue("_id").(string)
	if err := h.ReportService.CheckAdminAuthorization(context.Background(), idValue, req.AdminCode); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado: " + err.Error()})
	}
	if err := h.ReportService.DeleteJob(context.Background(), req.JobId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "job delete"})
}
func (h *ReportHandler) DeletePost(c *fiber.Ctx) error {
	type request struct {
		PostId    primitive.ObjectID `json:"PostId"`
		AdminCode string             `json:"AdminCode"`
	}
	var req request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	idValue := c.Context().UserValue("_id").(string)
	if err := h.ReportService.CheckAdminAuthorization(context.Background(), idValue, req.AdminCode); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado: " + err.Error()})
	}
	if err := h.ReportService.DeletePost(context.Background(), req.PostId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "job delete"})
}
func (h *ReportHandler) DeleteContentReport(c *fiber.Ctx) error {
	type request struct {
		IdReport  primitive.ObjectID `json:"IdReport"`
		AdminCode string             `json:"AdminCode"`
	}
	var req request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "input inválido"})
	}
	idValue := c.Context().UserValue("_id").(string)
	if err := h.ReportService.CheckAdminAuthorization(context.Background(), idValue, req.AdminCode); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado: " + err.Error()})
	}
	if err := h.ReportService.DeleteContentReport(context.Background(), req.IdReport); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ContentReport delete"})
}

func (h *ReportHandler) GetContentReports(c *fiber.Ctx) error {
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	ctx := context.Background()
	reports, err := h.ReportService.GetContentReports(ctx, page)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
		"data":    reports,
	})
}
