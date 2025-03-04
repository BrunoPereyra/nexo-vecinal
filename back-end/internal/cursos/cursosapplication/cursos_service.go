package cursosapplication

import (
	cursosdomain "back-end/internal/cursos/cursosfomain"
	cursosinfrastructure "back-end/internal/cursos/cursosinfrastructura"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CursoService contiene la lógica de negocio para la gestión de cursos.
type CursoService struct {
	CursoRepository *cursosinfrastructure.CursoRepository
}

// NewCursoService crea una nueva instancia de CursoService.
func NewCursoService(repo *cursosinfrastructure.CursoRepository) *CursoService {
	return &CursoService{
		CursoRepository: repo,
	}
}

// CreateCurso crea un nuevo curso.
func (s *CursoService) CreateCurso(curso cursosdomain.Curso) error {
	return s.CursoRepository.CreateCurso(curso)
}

// GetCursosPaginated obtiene los cursos de forma paginada.
func (s *CursoService) GetCursosPaginated(page, limit int) ([]cursosdomain.Curso, error) {
	return s.CursoRepository.GetCursosPaginated(page, limit)
}

// GetActiveCursos obtiene los cursos cuya campaña aún no terminó.
func (s *CursoService) GetActiveCursos() ([]cursosdomain.Curso, error) {
	return s.CursoRepository.GetActiveCursos()
}

// GetCursoByID obtiene un curso por su ID.
func (s *CursoService) GetCursoByID(id string) (cursosdomain.Curso, error) {
	cursoid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return cursosdomain.Curso{}, err
	}

	return s.CursoRepository.GetCursoByID(cursoid)
}
