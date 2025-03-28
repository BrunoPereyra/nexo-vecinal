package middleware

import (
	"back-end/pkg/auth"
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TOTPAuthMiddleware validates TOTP code using a TOTPRepository
func TOTPAuthMiddleware(repo auth.TOTPRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from context (assumed to be set earlier in the request lifecycle)
		IdUserToken := c.Context().UserValue("_id").(string)

		userID, err := primitive.ObjectIDFromHex(IdUserToken)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		// Parse JSON body
		var body struct {
			TOTPCode string `json:"totp_code"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}

		// Validate TOTP code
		if body.TOTPCode == "" {
			if c.FormValue("totp_code") == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "TOTP code is required"})
			}
			body.TOTPCode = c.FormValue("totp_code")
		}

		// Retrieve the user's TOTP secret from the repository
		secret, err := repo.GetTOTPSecret(context.Background(), userID)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Failed to retrieve TOTP secret"})
		}

		// Validate the TOTP code
		if !totp.Validate(body.TOTPCode, secret) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid TOTP code"})
		}

		// If everything is fine, continue with the next middleware/handler
		return c.Next()
	}
}
