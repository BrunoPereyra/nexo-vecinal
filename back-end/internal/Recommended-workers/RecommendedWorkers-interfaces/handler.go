package recommendedworkersinterfaces

import (
	recommendedworkersapplication "back-end/internal/Recommended-workers/RecommendedWorkers-application"
	recommendedworkersdomain "back-end/internal/Recommended-workers/RecommendedWorkers-domain"

	"github.com/go-playground/validator"
	"github.com/gofiber/fiber/v2"
)

type RecommendedWorkersHandler struct {
	Service *recommendedworkersapplication.RecommendedWorkersService
}

func NewRecommendedWorkersHandler(service *recommendedworkersapplication.RecommendedWorkersService) *RecommendedWorkersHandler {
	return &RecommendedWorkersHandler{
		Service: service,
	}
}

func (rw *RecommendedWorkersHandler) GetRecommendedUsersHandler(c *fiber.Ctx) error {
	var req recommendedworkersdomain.GetWorkers

	// Bind desde query y body (por si acaso lo usás en POST también)
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Error parsing query parameters",
			"error":   err.Error(),
		})
	}

	validate := validator.New()
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid parameters",
			"error":   err.Error(),
		})
	}

	users, err := rw.Service.GetRecommendedWorkers(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Error retrieving recommended users",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"recommendedUsers": users,
		"page":             req.Page,
		"limit":            req.Limit,
	})
}
