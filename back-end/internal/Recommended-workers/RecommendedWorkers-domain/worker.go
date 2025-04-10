package recommendedworkersdomain

import (
	userdomain "back-end/internal/user/user-domain"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RecommendedWorker struct {
	WorkerID       primitive.ObjectID  `bson:"workerId"`
	AverageRating  float64             `bson:"averageRating"`
	TotalJobs      int                 `bson:"totalJobs"`
	UpdatedAt      time.Time           `bson:"updatedAt"`
	OldestFeedback time.Time           `bson:"oldestFeedback"`
	Tags           []string            `bson:"tags"`
	Premium        userdomain.Premium  `bson:"premium,omitempty"` // Puede no estar presente si no es suscriptor
	GeoPoint       userdomain.GeoPoint `bson:"geoPoint"`
}

type GetWorkers struct {
	Categories  []string            `json:"categories" query:"categories"` // No requiere validación estricta
	Page        int                 `json:"page" query:"page" validate:"required,min=1"`
	Limit       int                 `json:"limit" query:"limit" validate:"required,min=1"`
	GeoPoint    userdomain.GeoPoint `json:"geoPoint" validate:"required,dive"`       // dive para validar campos internos
	MaxDistance int                 `json:"maxDistance" validate:"required,min=100"` // por ejemplo, mínimo 100 metros
}
