package admininfrastructure

import (
	"context"
	"errors"
	"fmt"
	"time"

	"back-end/internal/admin/admindomain"
	userdomain "back-end/internal/user/user-domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ReportRepository se encarga del acceso a datos para reportes y bloqueo de usuarios.
type ReportRepository struct {
	mongoClient *mongo.Client
}

// NewReportRepository crea una nueva instancia de ReportRepository.
func NewReportRepository(mongoClient *mongo.Client) *ReportRepository {
	return &ReportRepository{
		mongoClient: mongoClient,
	}
}

// CreateReport inserta un nuevo reporte en la colección "user_reports".
func (r *ReportRepository) CreateReport(ctx context.Context, report admindomain.UserReport) error {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("user_reports")
	// Inicialmente el reporte no ha sido leído
	report.Read = false
	report.CreatedAt = time.Now()
	_, err := collection.InsertOne(ctx, report)
	if err != nil {
		return fmt.Errorf("failed to create report: %v", err)
	}
	return nil
}

// GetReportById recupera un reporte por su ID.
func (r *ReportRepository) GetReportById(ctx context.Context, id string) (*admindomain.UserReport, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid report id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("user_reports")
	var report admindomain.UserReport
	err = collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&report)
	if err != nil {
		return nil, fmt.Errorf("report not found: %v", err)
	}
	return &report, nil
}

// GetReportsByUser recupera los reportes para un usuario reportado, ordenados por fecha.
func (r *ReportRepository) GetReportsByUser(ctx context.Context, reportedUserID string, order string) ([]admindomain.UserReport, error) {
	oid, err := primitive.ObjectIDFromHex(reportedUserID)
	if err != nil {
		return nil, fmt.Errorf("invalid reported user id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("user_reports")
	sortOrder := 1
	if order == "desc" {
		sortOrder = -1
	}
	opts := options.Find()
	opts.SetSort(bson.D{{Key: "createdAt", Value: sortOrder}})
	cursor, err := collection.Find(ctx, bson.M{"reportedUserId": oid}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get reports: %v", err)
	}
	var reports []admindomain.UserReport
	if err = cursor.All(ctx, &reports); err != nil {
		return nil, fmt.Errorf("failed to decode reports: %v", err)
	}
	return reports, nil
}

func (r *ReportRepository) GetGlobalReports(ctx context.Context, order string) ([]admindomain.UserReportResponse, error) {
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("user_reports")
	sortOrder := 1
	if order == "desc" {
		sortOrder = -1
	}

	// Pipeline de agregación para unir la información de los usuarios.
	pipeline := mongo.Pipeline{
		// Lookup para el usuario reportado.
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Users"},
			{Key: "localField", Value: "reportedUserId"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "reportedUser"},
		}}},
		{{Key: "$unwind", Value: "$reportedUser"}},
		// Lookup para el usuario que realiza el reporte.
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Users"},
			{Key: "localField", Value: "reporterUserId"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "reporterUser"},
		}}},
		{{Key: "$unwind", Value: "$reporterUser"}},
		// Ordenar por fecha.
		{{Key: "$sort", Value: bson.D{{Key: "createdAt", Value: sortOrder}}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get global reports: %v", err)
	}
	var reports []admindomain.UserReportResponse
	if err = cursor.All(ctx, &reports); err != nil {
		return nil, fmt.Errorf("failed to decode global reports: %v", err)
	}
	return reports, nil
}

// MarkReportAsRead marca un reporte como leído.
func (r *ReportRepository) MarkReportAsRead(ctx context.Context, reportID string) error {
	oid, err := primitive.ObjectIDFromHex(reportID)
	if err != nil {
		return fmt.Errorf("invalid report id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("user_reports")
	update := bson.M{
		"$set": bson.M{
			"read": true,
		},
	}
	res, err := collection.UpdateOne(ctx, bson.M{"_id": oid}, update)
	if err != nil {
		return fmt.Errorf("failed to mark report as read: %v", err)
	}
	if res.MatchedCount == 0 {
		return errors.New("report not found")
	}
	return nil
}

// BlockUser actualiza el campo "Banned" del usuario a true para bloquearlo.
func (r *ReportRepository) BlockUser(ctx context.Context, userID string) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	update := bson.M{"$set": bson.M{"Banned": true}}
	res, err := collection.UpdateOne(ctx, bson.M{"_id": oid}, update)
	if err != nil {
		return fmt.Errorf("failed to block user: %v", err)
	}
	if res.MatchedCount == 0 {
		return errors.New("user not found")
	}
	return nil
}

// CheckAdminAuthorization valida que el usuario sea administrador mediante PanelAdminNexoVecinal.
func (r *ReportRepository) CheckAdminAuthorization(ctx context.Context, adminID string, code string) error {
	oid, err := primitive.ObjectIDFromHex(adminID)
	if err != nil {
		return fmt.Errorf("invalid admin id: %v", err)
	}
	collection := r.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var admin userdomain.User
	err = collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&admin)
	if err != nil {
		return fmt.Errorf("admin not found: %v", err)
	}
	if admin.PanelAdminNexoVecinal.Level != 1 || !admin.PanelAdminNexoVecinal.Asset || admin.PanelAdminNexoVecinal.Code != code {
		return fmt.Errorf("usuario no autorizado")
	}
	return nil
}
