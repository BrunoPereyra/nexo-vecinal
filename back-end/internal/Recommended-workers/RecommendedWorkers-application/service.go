package recommendedworkersapplication

import (
	jobdomain "back-end/internal/Job/Job-domain"
	recommendedworkersdomain "back-end/internal/Recommended-workers/RecommendedWorkers-domain"
	recommendedworkersinfrastructure "back-end/internal/Recommended-workers/RecommendedWorkers-infrastructure"
)

type RecommendedWorkersService struct {
	Repo *recommendedworkersinfrastructure.RecommendedWorkersRepository
}

func NewRecommendedWorkersService(repo *recommendedworkersinfrastructure.RecommendedWorkersRepository) *RecommendedWorkersService {
	return &RecommendedWorkersService{
		Repo: repo,
	}
}

// GetRecommendedUsers obtiene la lista de usuarios recomendados con filtros y paginación.
func (rw *RecommendedWorkersService) GetRecommendedWorkers(req recommendedworkersdomain.GetWorkers) ([]jobdomain.User, error) {
	return rw.Repo.GetRecommendedWorkers(req)
}
