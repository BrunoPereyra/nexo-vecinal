package metrics

import "time"

type AppDailyMetrics struct {
	ID        string                       `bson:"_id,omitempty"`
	Timestamp time.Time                    `bson:"timestamp"`
	Days      map[string]DailyMetricsByDay `bson:"days"`
}

type DailyMetricsByDay struct {
	UserRegistrations UserRegistrationsMetrics `bson:"userRegistrations"`
	Subscriptions     SubscriptionMetrics      `bson:"subscriptions"`
	JobPublications   JobEventMetrics          `bson:"jobPublications"`
	JobCompletions    JobEventMetrics          `bson:"jobCompletions"`
}
type UserRegistrationsMetrics struct {
	Total   UserDemographicTotals            `bson:"total"`
	Sources map[string]UserDemographicTotals `bson:"referers"` // Ej: {"instagram": {...}, "amigo": {...}}
}

type UserDemographicTotals struct {
	Genders    map[string]int `bson:"genders"`    // Ej: {"male": 10, "female": 15}
	Intentions map[string]int `bson:"intentions"` // Ej: {"hire": 5, "work": 7}
	BirthYears map[int]int    `bson:"birthYears"` // Ej: {1998: 3, 2000: 6}
}
type SubscriptionMetrics struct {
	Genders    map[string]int `bson:"genders"`    // Ej: {"male": 3, "female": 6}
	BirthYears map[int]int    `bson:"birthYears"` // Ej: {1995: 1, 2001: 2}
	Count      int            `bson:"count"`      // Total de publicaciones o finalizaciones
}
type JobEventMetrics struct {
	Genders    map[string]int `bson:"genders"`    // Género de quien publica o finaliza
	BirthYears map[int]int    `bson:"birthYears"` // Año de nacimiento de quien publica o finaliza
	Count      int            `bson:"count"`      // Total de publicaciones o finalizaciones
}
