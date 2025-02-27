package cursosdomain

import (
	"time"

	"github.com/go-playground/validator"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Socials representa los enlaces de redes sociales asociados a un curso.
type Socials struct {
	Instagram string `json:"instagram" bson:"instagram" validate:"required,url"`
	Youtube   string `json:"youtube" bson:"youtube" validate:"required,url"`
	Website   string `json:"website" bson:"website" validate:"required,url"`
	Twitter   string `json:"twitter" bson:"twitter" validate:"required,url"`
}

// Curso representa la entidad de un curso.
type Curso struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title         string             `json:"title" bson:"title" validate:"required"`
	Description   string             `json:"description" bson:"description" validate:"required"`
	Content       string             `json:"content" bson:"content" validate:"required"`
	Socials       Socials            `json:"socials" bson:"socials" validate:"required,dive"`
	CampaignStart time.Time          `json:"campaignStart" bson:"campaignStart" validate:"required"`
	CampaignEnd   time.Time          `json:"campaignEnd" bson:"campaignEnd" validate:"required,gtfield=CampaignStart"`
	Baneado       bool               `json:"baneado" bson:"baneado"`
	Seccion       string             `json:"seccion" bson:"seccion" validate:"required"`
}

// SocialsModel representa los enlaces sociales asociados al curso.
type SocialsModel struct {
	Instagram string `json:"instagram" validate:"required,url"`
	Youtube   string `json:"youtube" validate:"required,url"`
	Website   string `json:"website" validate:"required,url"`
	Twitter   string `json:"twitter" validate:"required,url"`
}

// CursoModelValidator se utiliza para validar la información de creación de un curso.
type CursoModelValidator struct {
	Title         string       `json:"title" validate:"required"`
	Description   string       `json:"description" validate:"required"`
	Content       string       `json:"content" validate:"required"`
	Socials       SocialsModel `json:"socials" validate:"required,dive"`
	CampaignStart string       `json:"campaignStart" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	CampaignEnd   string       `json:"campaignEnd" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	Baneado       bool         `json:"baneado"`
	Seccion       string       `json:"seccion" validate:"required"`
	Code          string       `json:"code" validate:"required"`
	// Estos campos se asignan luego de la validación para usarlos en el modelo de dominio.
	CampaignStartTime time.Time `json:"-" bson:"campaignStart"`
	CampaignEndTime   time.Time `json:"-" bson:"campaignEnd"`
}

// ValidateCurso valida el modelo y parsea las fechas de campaña.
func (c *CursoModelValidator) ValidateCurso() error {
	validate := validator.New()

	if err := validate.Struct(c); err != nil {
		return err
	}

	// Parseo de la fecha de inicio de campaña.
	start, err := time.Parse("2006-01-02T15:04:05Z07:00", c.CampaignStart)
	if err != nil {
		return err
	}
	c.CampaignStartTime = start

	// Parseo de la fecha de fin de campaña.
	end, err := time.Parse("2006-01-02T15:04:05Z07:00", c.CampaignEnd)
	if err != nil {
		return err
	}
	c.CampaignEndTime = end

	return nil
}
