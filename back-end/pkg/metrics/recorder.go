package metrics

import (
	"context"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MetricsService struct {
	DB *mongo.Database
}

func NewMetricsService(db *mongo.Database) *MetricsService {
	return &MetricsService{DB: db}
}

func (ms *MetricsService) getOrCreateDailyDoc(ctx context.Context, date time.Time) (*mongo.Collection, string, string, error) {
	collection := ms.DB.Collection("AppDailyMetrics")
	docID := date.Format("2006-01")
	dayKey := date.Format("2")

	filter := bson.M{"_id": docID}
	update := bson.M{
		"$setOnInsert": bson.M{
			"_id":       docID,
			"timestamp": date,
			"days":      bson.M{},
		},
	}
	_, err := collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	if err != nil {
		return nil, "", "", err
	}

	return collection, docID, dayKey, nil
}

func (ms *MetricsService) RegisterUser(ctx context.Context, gender, intention, referer string, birthDate time.Time) error {
	birthYearStr := strconv.Itoa(birthDate.Year())
	coll, docID, day, err := ms.getOrCreateDailyDoc(ctx, time.Now())
	if err != nil {
		return err
	}
	totalPath := "days." + day + ".userRegistrations.total"
	refererPath := "days." + day + ".userRegistrations.referers." + referer

	update := bson.M{
		"$inc": bson.M{
			totalPath + ".genders." + gender:            1,
			totalPath + ".intentions." + intention:      1,
			totalPath + ".birthYears." + birthYearStr:   1,
			refererPath + ".genders." + gender:          1,
			refererPath + ".intentions." + intention:    1,
			refererPath + ".birthYears." + birthYearStr: 1,
		},
	}
	_, err = coll.UpdateByID(ctx, docID, update)

	return err
}

// falta test
func (ms *MetricsService) RegisterSubscription(ctx context.Context, gender string, birthDate time.Time) error {
	birthYearStr := strconv.Itoa(birthDate.Year())
	coll, docID, day, err := ms.getOrCreateDailyDoc(ctx, time.Now())
	if err != nil {
		return err
	}

	path := "days." + day + ".subscriptions"
	update := bson.M{
		"$inc": bson.M{
			path + ".genders." + gender:          1,
			path + ".birthYears." + birthYearStr: 1,
			path + ".count":                      1,
		},
	}
	_, err = coll.UpdateByID(ctx, docID, update)
	return err
}

func (ms *MetricsService) RegisterJobPublication(ctx context.Context, gender string, birthDate time.Time) error {
	return ms.registerJobEvent(ctx, "jobPublications", gender, birthDate)
}

func (ms *MetricsService) RegisterJobCompletion(ctx context.Context, gender string, birthDate time.Time) error {
	return ms.registerJobEvent(ctx, "jobCompletions", gender, birthDate)
}

func (ms *MetricsService) registerJobEvent(ctx context.Context, field, gender string, birthDate time.Time) error {
	birthYearStr := strconv.Itoa(birthDate.Year())
	coll, docID, day, err := ms.getOrCreateDailyDoc(ctx, time.Now())
	if err != nil {
		return err
	}

	path := "days." + day + "." + field
	update := bson.M{
		"$inc": bson.M{
			path + ".genders." + gender:          1,
			path + ".birthYears." + birthYearStr: 1,
			path + ".count":                      1,
		},
	}
	_, err = coll.UpdateByID(ctx, docID, update)
	return err
}
