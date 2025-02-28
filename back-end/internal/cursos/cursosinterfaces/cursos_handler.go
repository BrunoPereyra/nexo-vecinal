package cursosinterfaces

import (
	"back-end/internal/cursos/cursosapplication"
	cursosdomain "back-end/internal/cursos/cursosfomain"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserRepository define el contrato para la validación del código.
// Se asume que existe un método AutCode para verificar el código del usuario.
type UserRepository interface {
	AutCode(id primitive.ObjectID, code string) error
}

// CursoHandler expone los endpoints HTTP para la gestión de cursos.
type CursoHandler struct {
	CursoService *cursosapplication.CursoService
	UserRepo     UserRepository
}

// NewCursoHandler crea una nueva instancia de CursoHandler.
func NewCursoHandler(service *cursosapplication.CursoService, userRepo UserRepository) *CursoHandler {
	return &CursoHandler{
		CursoService: service,
		UserRepo:     userRepo,
	}
}

// CreateCurso maneja la creación de un nuevo curso.
func (h *CursoHandler) CreateCurso(c *fiber.Ctx) error {
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	var req cursosdomain.CursoModelValidator
	fmt.Println(c.BodyParser(&req))
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid request body"})
	}

	if err := req.ValidateCurso(); err != nil {
		fmt.Print(err.Error())

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": err.Error()})
	}

	// Verificar el código de autorización del usuario.
	if err := h.UserRepo.AutCode(userID, req.Code); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "usuario no autorizado"})
	}

	// Mapeo del request al objeto de dominio.
	curso := cursosdomain.Curso{
		Title:       req.Title,
		Description: req.Description,
		Content:     req.Content,
		Socials: cursosdomain.Socials{
			Instagram: req.Socials.Instagram,
			Youtube:   req.Socials.Youtube,
			Website:   req.Socials.Website,
			Twitter:   req.Socials.Twitter,
		},
		CampaignStart: req.CampaignStartTime,
		CampaignEnd:   req.CampaignEndTime,
		Baneado:       req.Baneado,
		Seccion:       req.Seccion,
	}

	err = h.CursoService.CreateCurso(curso)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error creating course"})
	}
	return c.Status(fiber.StatusCreated).JSON(curso)
}

// GetCursosPaginated maneja la obtención de cursos de forma paginada y ordenados por CampaignEnd (descendente).
func (h *CursoHandler) GetCursosPaginated(c *fiber.Ctx) error {
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.Query("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	cursos, err := h.CursoService.GetCursosPaginated(page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error fetching courses"})
	}
	return c.JSON(cursos)
}

// GetActiveCursos maneja la obtención de cursos cuya campaña aún no ha finalizado.
func (h *CursoHandler) GetActiveCursos(c *fiber.Ctx) error {
	cursos, err := h.CursoService.GetActiveCursos()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error fetching active courses"})
	}
	return c.JSON(cursos)
}
