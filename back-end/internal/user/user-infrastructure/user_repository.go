package userinfrastructure

import (
	domain "back-end/internal/user/user-domain"
	userdomain "back-end/internal/user/user-domain"
	"back-end/pkg/authGoogleAuthenticator"
	"back-end/pkg/helpers"
	"math/rand"

	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository struct {
	redisClient *redis.Client
	mongoClient *mongo.Client
}

func NewUserRepository(redisClient *redis.Client, mongoClient *mongo.Client) *UserRepository {
	return &UserRepository{
		redisClient: redisClient,
		mongoClient: mongoClient,
	}
}

func (u *UserRepository) IsUserBlocked(nameUser string) (bool, error) {
	blockKey := fmt.Sprintf("login_blocked:%s", nameUser)

	_, err := u.redisClient.Get(context.Background(), blockKey).Result()
	if err == redis.Nil {
		return false, nil
	} else if err != nil {
		return false, fmt.Errorf("error checking if user is blocked in Redis: %v", err)
	}

	return true, nil
}
func (u *UserRepository) HandleLoginFailure(nameUser string) error {
	key := fmt.Sprintf("login_failures:%s", nameUser)

	failures, err := u.redisClient.Get(context.Background(), key).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("error getting login failures from Redis: %v", err)
	}

	failureCount := 0
	if failures != "" {
		failureCount, err = strconv.Atoi(failures)
		if err != nil {
			return fmt.Errorf("error converting login failures to integer: %v", err)
		}
	}

	failureCount++

	if failureCount >= 5 {
		// Set a block expiration for 15 minutes
		blockKey := fmt.Sprintf("login_blocked:%s", nameUser)
		_, err = u.redisClient.Set(context.Background(), blockKey, "blocked", 15*time.Minute).Result()
		if err != nil {
			return fmt.Errorf("error setting block key in Redis: %v", err)
		}
	} else {
		_, err = u.redisClient.Set(context.Background(), key, failureCount, 15*time.Minute).Result()
		if err != nil {
			return fmt.Errorf("error setting login failures in Redis: %v", err)
		}
	}

	return nil
}

func (u *UserRepository) SetTOTPSecret(ctx context.Context, userID primitive.ObjectID, secret string) error {
	existingSecret, err := u.GetTOTPSecret(ctx, userID)
	if err != nil {
		return err
	}
	if existingSecret != "" {
		return nil
	}

	usersCollection := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": userID}
	update := bson.M{"$set": bson.M{"TOTPSecret": secret}}
	_, err = usersCollection.UpdateOne(ctx, filter, update)
	return err
}
func (u *UserRepository) SavePushToken(userID primitive.ObjectID, pushToken string) error {
	ctx := context.Background()
	usersCollection := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": userID}
	update := bson.M{"$set": bson.M{"pushToken": pushToken}}
	_, err := usersCollection.UpdateOne(ctx, filter, update)
	return err
}
func (u *UserRepository) UserPremiumExtend(userID primitive.ObjectID) error {
	ctx := context.Background()
	usersCollection := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	// Traer el usuario actual
	var user struct {
		Premium struct {
			SubscriptionStart time.Time `bson:"SubscriptionStart"`
			SubscriptionEnd   time.Time `bson:"SubscriptionEnd"`
			MonthsSubscribed  int       `bson:"MonthsSubscribed"`
		} `bson:"Premium"`
	}
	err := usersCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return err
	}

	now := time.Now()

	start := user.Premium.SubscriptionStart
	if start.IsZero() || start.Year() <= 1 {
		start = now
	}

	end := user.Premium.SubscriptionEnd
	if end.IsZero() || end.Year() <= 1 {
		end = now
	}
	newEnd := end.AddDate(0, 1, 0) // +1 mes

	update := bson.M{
		"$set": bson.M{
			"Premium.SubscriptionStart": start,
			"Premium.SubscriptionEnd":   newEnd,
		},
		"$inc": bson.M{
			"Premium.MonthsSubscribed": 1,
		},
	}

	_, err = usersCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	return err
}

func (j *UserRepository) UpdateRecommendedWorkerPremium(workerId primitive.ObjectID) error {
	ctx := context.Background()
	now := time.Now()

	// Obtener info del usuario
	usersColl := j.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	var user struct {
		Premium *userdomain.Premium `bson:"Premium"`
		Tags    []string            `bson:"tags"`
	}
	if err := usersColl.FindOne(ctx, bson.M{"_id": workerId}).Decode(&user); err != nil {
		return err
	}

	isPremium := user.Premium != nil && user.Premium.SubscriptionEnd.After(now)

	recommendedWorkersColl := j.mongoClient.Database("NEXO-VECINAL").Collection("RecommendedWorkers")
	update := bson.M{
		"$set": bson.M{
			"updatedAt":      now,
			"oldestFeedback": now,
			"premium":        user.Premium,
		},

		"$setOnInsert": bson.M{
			"workerId":  workerId,
			"createdAt": now,
		},
		"$addToSet": bson.M{
			"tags": bson.M{"$each": user.Tags},
		},
	}

	if isPremium {
		update["$set"].(bson.M)["premium"] = user.Premium
	}

	opts := options.Update().SetUpsert(true)
	_, err := recommendedWorkersColl.UpdateOne(ctx, bson.M{"workerId": workerId}, update, opts)
	return err
}

func (u *UserRepository) GetTOTPSecret(ctx context.Context, userID primitive.ObjectID) (string, error) {
	usersCollection := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": userID}
	projection := bson.M{"TOTPSecret": 1, "_id": 0}
	var result struct {
		TOTPSecret string `bson:"TOTPSecret"`
	}
	err := usersCollection.FindOne(ctx, filter, options.FindOne().SetProjection(projection)).Decode(&result)
	if err != nil {
		return "", err
	}
	return result.TOTPSecret, nil
}

func (u *UserRepository) ValidateTOTPCode(ctx context.Context, userID primitive.ObjectID, code string) (bool, error) {
	secret, err := u.GetTOTPSecret(ctx, userID)
	if err != nil {
		return false, err
	}
	return authGoogleAuthenticator.ValidateCode(secret, code), nil
}

func (u *UserRepository) DeleteGoogleAuthenticator(id primitive.ObjectID) error {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"TOTPSecret": "",
		},
	}
	_, err := GoMongoDBCollUsers.UpdateOne(context.TODO(), filter, update)
	return err
}
func (u *UserRepository) FindNameUserNoSensitiveInformation(NameUser string, Email string) (*domain.GetUser, error) {
	var filter primitive.D
	if Email == "" {
		filter = bson.D{
			{Key: "$or", Value: bson.A{
				bson.D{{Key: "NameUser", Value: NameUser}},
				bson.D{{Key: "NameUser", Value: primitive.Regex{Pattern: NameUser, Options: "i"}}},
			}},
		}
	} else {
		filter = bson.D{
			{Key: "$or", Value: bson.A{
				bson.D{{Key: "NameUser", Value: NameUser}},
				bson.D{{Key: "Email", Value: Email}},
			}},
		}
	}
	return u.getUser(filter)
}
func (u *UserRepository) ChangeNameUser(changeNameUser domain.ChangeNameUser) error {

	ctx := context.TODO()
	db := u.mongoClient.Database("NEXO-VECINAL")
	if !u.doesUserExist(ctx, db, changeNameUser.NameUserRemove) {
		return fmt.Errorf("NameUserRemove does not exist")
	}
	if u.doesUserExist(ctx, db, changeNameUser.NameUserNew) {
		return fmt.Errorf("NameUserNew already exists")
	}

	err := u.updateUserNames(ctx, db, changeNameUser)
	if err != nil {
		return err
	}
	err = u.updateUserInformationInAllRooms(ctx, db, changeNameUser)
	if err != nil {
		return err
	}
	return nil
}

func (u *UserRepository) ChangeNameUserCodeAdmin(changeNameUser domain.ChangeNameUser, id primitive.ObjectID) error {
	err := u.AutCode(id, changeNameUser.Code)
	if err != nil {
		return err
	}
	ctx := context.TODO()
	db := u.mongoClient.Database("NEXO-VECINAL")
	if !u.doesUserExist(ctx, db, changeNameUser.NameUserRemove) {
		return fmt.Errorf("NameUserRemove does not exist")
	}
	if u.doesUserExist(ctx, db, changeNameUser.NameUserNew) {
		return fmt.Errorf("NameUserNew already exists")
	}

	err = u.updateUserNamesAdmin(ctx, db, changeNameUser)
	if err != nil {
		return err
	}

	err = u.updateUserInformationInAllRooms(ctx, db, changeNameUser)
	if err != nil {
		return err
	}
	return nil
}

func (u *UserRepository) doesUserExist(ctx context.Context, db *mongo.Database, nameUser string) bool {
	GoMongoDBCollUsers := db.Collection("Users")

	filter := bson.M{"NameUser": bson.M{"$regex": "^" + nameUser + "$", "$options": "i"}}

	count, err := GoMongoDBCollUsers.CountDocuments(ctx, filter)
	if err != nil {
		return false
	}
	return count > 0
}

func (u *UserRepository) updateUserInformationInAllRooms(ctx context.Context, db *mongo.Database, changeNameUser domain.ChangeNameUser) error {
	GoMongoDBCollUsers := db.Collection("UserInformationInAllRooms")
	userFilterTemp := bson.M{"NameUser": changeNameUser.NameUserRemove}
	updateTemp := bson.M{"$set": bson.M{"NameUser": changeNameUser.NameUserNew}}
	_, err := GoMongoDBCollUsers.UpdateOne(ctx, userFilterTemp, updateTemp)
	if err != nil {
		return fmt.Errorf("error updating user collection to NameUserNew: %v", err)
	}

	return nil
}
func (u *UserRepository) updateUserNames(ctx context.Context, db *mongo.Database, changeNameUser domain.ChangeNameUser) error {
	GoMongoDBCollUsers := db.Collection("Users")

	// Estructura que contiene la propiedad NameUser en EditProfiile
	var existingUser struct {
		EditProfiile struct {
			NameUser time.Time `bson:"NameUser,omitempty"`
		} `bson:"EditProfiile"`
	}

	// Filtrar el usuario por su nombre de usuario actual
	userFilterTemp := bson.M{"NameUser": changeNameUser.NameUserRemove}
	err := GoMongoDBCollUsers.FindOne(ctx, userFilterTemp).Decode(&existingUser)
	if err != nil {
		return fmt.Errorf("error finding user with NameUser: %v", err)
	}

	// Verificar si han pasado más de 60 días desde la última actualización del nombre de usuario
	timeSinceLastChange := time.Since(existingUser.EditProfiile.NameUser)
	if timeSinceLastChange < 60*24*time.Hour {
		return fmt.Errorf("no puedes actualizar el nombre de usuario hasta que pasen 60 días desde el último cambio")
	}

	// Si han pasado más de 60 días, actualizamos el nombre de usuario y la fecha de actualización
	updateTemp := bson.M{
		"$set": bson.M{
			"NameUser":              changeNameUser.NameUserNew,
			"EditProfiile.NameUser": time.Now(), // Actualizamos la fecha de la última modificación del nombre de usuario
		},
	}

	_, err = GoMongoDBCollUsers.UpdateOne(ctx, userFilterTemp, updateTemp)
	if err != nil {
		return fmt.Errorf("error updating user collection to NameUserNew: %v", err)
	}

	return nil
}

func (u *UserRepository) updateUserNamesAdmin(ctx context.Context, db *mongo.Database, changeNameUser domain.ChangeNameUser) error {
	GoMongoDBCollUsers := db.Collection("Users")

	userFilterTemp := bson.M{"NameUser": changeNameUser.NameUserRemove}
	updateTemp := bson.M{"$set": bson.M{"NameUser": changeNameUser.NameUserNew}}
	_, err := GoMongoDBCollUsers.UpdateOne(ctx, userFilterTemp, updateTemp)
	if err != nil {
		return fmt.Errorf("error updating user collection to NameUserNew: %v", err)
	}

	return nil
}

func (s *UserRepository) SubscribeToRoom(roomID string) *redis.PubSub {
	sub := s.redisClient.Subscribe(context.Background(), roomID)
	return sub
}

func (s *UserRepository) CloseSubscription(sub *redis.PubSub) error {
	return sub.Close()
}

func (u *UserRepository) PanelAdminPinkkerPartnerUser(PanelAdminPinkkerInfoUserReq domain.PanelAdminPinkkerInfoUserReq, id primitive.ObjectID) error {
	// Autenticar el código
	err := u.AutCode(id, PanelAdminPinkkerInfoUserReq.Code)
	if err != nil {
		return err
	}
	ctx := context.TODO()

	// Conectar a la base de datos y obtener la colección de usuarios
	db := u.mongoClient.Database("NEXO-VECINAL")
	GoMongoDBCollUsers := db.Collection("Users")

	// Crear el filtro para encontrar al usuario
	var userFilter bson.M
	if PanelAdminPinkkerInfoUserReq.IdUser != primitive.NilObjectID {
		userFilter = bson.M{"_id": PanelAdminPinkkerInfoUserReq.IdUser}
	} else if PanelAdminPinkkerInfoUserReq.NameUser != "" {
		userFilter = bson.M{"NameUser": PanelAdminPinkkerInfoUserReq.NameUser}
	} else {
		return errors.New("IdUser and NameUser are empty")
	}

	var userResult domain.User
	err = GoMongoDBCollUsers.FindOne(ctx, userFilter).Decode(&userResult)
	if err != nil {
		return err
	}

	newActiveState := !userResult.Partner.Active

	update := bson.M{
		"$set": bson.M{
			"Partner.Active": newActiveState,
			"Partner.Date":   time.Now(),
		},
	}

	_, err = GoMongoDBCollUsers.UpdateOne(ctx, userFilter, update)
	if err != nil {
		return err
	}

	return nil
}
func (u *UserRepository) CreateAdmin(CreateAdmin domain.CreateAdmin, id primitive.ObjectID) error {
	err := u.AutCode(id, CreateAdmin.Code)
	if err != nil {
		return err
	}
	ctx := context.TODO()

	db := u.mongoClient.Database("NEXO-VECINAL")
	GoMongoDBCollUsers := db.Collection("Users")

	var userFilter bson.M
	if CreateAdmin.IdUser != primitive.NilObjectID {
		userFilter = bson.M{"_id": CreateAdmin.IdUser}
	} else if CreateAdmin.NameUser != "" {
		userFilter = bson.M{"NameUser": CreateAdmin.NameUser}
	} else {
		return errors.New("IdUser and NameUser are empty")
	}

	var userResult domain.User
	err = GoMongoDBCollUsers.FindOne(ctx, userFilter).Decode(&userResult)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"PanelAdminNexoVecinal.Level": CreateAdmin.Level,
			"PanelAdminNexoVecinal.Asset": true,
			"PanelAdminNexoVecinal.Code":  CreateAdmin.NewCode,
			"PanelAdminNexoVecinal.Date":  time.Now(),
		},
	}

	_, err = GoMongoDBCollUsers.UpdateOne(ctx, userFilter, update)
	if err != nil {
		return err
	}

	return nil
}

func (u *UserRepository) AutCode(id primitive.ObjectID, code string) error {
	db := u.mongoClient.Database("NEXO-VECINAL")
	collectionUsers := db.Collection("Users")
	var User domain.User

	err := collectionUsers.FindOne(context.Background(), bson.M{"_id": id}).Decode(&User)
	if err != nil {
		return err
	}

	if User.PanelAdminNexoVecinal.Level != 1 || User.PanelAdminNexoVecinal.Code != code {
		return fmt.Errorf("usuario no autorizado")
	}
	return nil
}

func (u *UserRepository) GetUserByCodeFromRedis(code string) (*domain.User, error) {

	userJSON, errGet := u.redisClient.Get(context.Background(), code).Result()
	if errGet != nil {
		return nil, errGet
	}

	var user domain.User
	errUnmarshal := json.Unmarshal([]byte(userJSON), &user)
	if errUnmarshal != nil {
		return nil, errUnmarshal
	}

	_, errDel := u.redisClient.Del(context.Background(), code).Result()
	if errDel != nil {
		return &user, nil
	}
	return &user, nil
}

func (u *UserRepository) SaveUser(User *domain.User) (primitive.ObjectID, error) {

	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	insertResult, errInsertOne := GoMongoDBCollUsers.InsertOne(context.Background(), User)
	if errInsertOne != nil {
		return primitive.NilObjectID, errInsertOne
	}
	insertedID := insertResult.InsertedID.(primitive.ObjectID)
	return insertedID, nil
}
func (u *UserRepository) FindNameUser(NameUser string, Email string) (*domain.User, error) {
	var FindUserInDb primitive.D
	if Email == "" {
		FindUserInDb = bson.D{
			{Key: "$or", Value: bson.A{
				bson.D{{Key: "NameUser", Value: NameUser}},
				bson.D{{Key: "NameUser", Value: primitive.Regex{Pattern: NameUser, Options: "i"}}},
			}},
		}
	} else {
		FindUserInDb = bson.D{
			{
				Key: "$or",
				Value: bson.A{
					bson.D{{Key: "NameUser", Value: NameUser}},
					bson.D{{Key: "Email", Value: Email}},
				},
			},
		}
	}

	return u.getFullUser(FindUserInDb)
}
func (u *UserRepository) FindNameUserInternalOperation(NameUser string, Email string) (*domain.User, error) {
	var FindUserInDb primitive.D
	if Email == "" {
		FindUserInDb = bson.D{
			{Key: "$or", Value: bson.A{
				bson.D{{Key: "NameUser", Value: NameUser}},
				bson.D{{Key: "NameUser", Value: primitive.Regex{Pattern: NameUser, Options: "i"}}},
			}},
		}
	} else {
		FindUserInDb = bson.D{
			{
				Key: "$or",
				Value: bson.A{
					bson.D{{Key: "NameUser", Value: NameUser}},
					bson.D{{Key: "Email", Value: Email}},
				},
			},
		}
	}

	return u.getFullUserInternalOperations(FindUserInDb)
}
func (u *UserRepository) GetUserByNameUserIndex(NameUser string) ([]*domain.GetUser, error) {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	indexModel := mongo.IndexModel{
		Keys: bson.D{{Key: "NameUser", Value: 1}},
	}
	_, err := GoMongoDBCollUsers.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		return nil, err
	}

	filter := bson.D{{Key: "NameUser", Value: primitive.Regex{Pattern: NameUser, Options: "i"}}}

	findOptions := options.Find().SetLimit(10)

	cursor, err := GoMongoDBCollUsers.Find(context.Background(), filter, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var users []*domain.GetUser
	for cursor.Next(context.Background()) {
		var user domain.GetUser
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, nil
}

func (u *UserRepository) FindUserById(id primitive.ObjectID) (*domain.User, error) {
	filter := bson.D{{Key: "_id", Value: id}}
	return u.getFullUser(filter)
}

func (u *UserRepository) GetUserBykey(key string) (*domain.GetUser, error) {
	filter := bson.D{{Key: "KeyTransmission", Value: key}}
	return u.getUser(filter)
}

func (u *UserRepository) GetUserBanInstream(key string) (bool, error) {
	filter := bson.D{{Key: "KeyTransmission", Value: key}}

	projection := bson.D{{Key: "Banned", Value: 1}, {Key: "_id", Value: 0}}

	var result struct {
		Banned bool `bson:"Banned"`
	}

	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	err := GoMongoDBCollUsers.FindOne(context.TODO(), filter, options.FindOne().SetProjection(projection)).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	return result.Banned, nil
}

func (u *UserRepository) SendConfirmationEmail(Email string, Token string) error {

	// confirmationLink := fmt.Sprintf("https://tudominio.com/confirm?token=%s", Token)

	// from := mail.NewEmail("Nombre de remitente", "noreply@tudominio.com")
	// subject := "Confirmación de correo electrónico"
	// to := mail.NewEmail("", Email)
	// content := mail.NewContent("text/plain", "Por favor, confirma tu correo electrónico haciendo clic en el siguiente enlace: "+confirmationLink)
	// message := mail.NewV3MailInit(from, subject, to, content)
	// SENDGRIDAPIKEY := config.SENDGRIDAPIKEY
	// sg := sendgrid.NewSendClient(SENDGRIDAPIKEY)

	// _, err := sg.Send(message)
	return nil
}
func (u *UserRepository) UpdateConfirmationEmailToken(user *domain.User) error {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	FindUserInDb := bson.D{
		{Key: "NameUser", Value: user.NameUser},
	}
	update := bson.D{{Key: "$set", Value: bson.D{{Key: "EmailConfirmation", Value: true}}}}
	_, err := GoMongoDBCollUsers.UpdateOne(context.Background(), FindUserInDb, update)
	if err != nil {
		return err
	}

	return nil
}

func (u *UserRepository) EditSocialNetworks(SocialNetwork domain.SocialNetwork, id primitive.ObjectID) error {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"socialnetwork.facebook":  SocialNetwork.Facebook,
			"socialnetwork.twitter":   SocialNetwork.Twitter,
			"socialnetwork.instagram": SocialNetwork.Instagram,
			"socialnetwork.youtube":   SocialNetwork.Youtube,
			"socialnetwork.tiktok":    SocialNetwork.Tiktok,
		},
	}

	_, err := GoMongoDBCollUsers.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}

	return nil
}

// get follows notis
func (u *UserRepository) GetRecentFollowsLastConnection(IdUserTokenP primitive.ObjectID, page int) ([]domain.FollowInfoRes, error) {
	db := u.mongoClient.Database("NEXO-VECINAL")
	GoMongoDBCollUsers := db.Collection("Users")

	limit := 10
	skip := (page - 1) * limit

	// Pipeline de agregación
	pipeline := bson.A{
		// 1. Filtramos por el usuario con el ID proporcionado
		bson.M{"$match": bson.M{"_id": IdUserTokenP}},
		// 2. Proyectamos los campos necesarios y convertimos el campo Followers a un arreglo
		bson.M{"$project": bson.M{
			"LastConnection": 1,
			"Followers": bson.M{
				"$objectToArray": "$Followers",
			},
		}},
		// 3. "Unwind" para descomponer el arreglo de Followers en documentos individuales
		bson.M{"$unwind": "$Followers"},
		// 4. Filtramos los seguidores que tienen la fecha 'since' mayor a la fecha 'LastConnection'
		bson.M{"$match": bson.M{
			"$expr": bson.M{
				"$gt": []interface{}{
					"$Followers.v.since", "$LastConnection",
				},
			},
		}},
		// 5. Convertimos Followers.k a ObjectId si no lo es ya
		bson.M{"$addFields": bson.M{
			"followerId": bson.M{
				"$cond": bson.M{
					"if":   bson.M{"$eq": bson.A{bson.M{"$type": "$Followers.k"}, "objectId"}},
					"then": "$Followers.k",
					"else": bson.M{"$toObjectId": "$Followers.k"},
				},
			},
		}},
		// 6. Lookup para obtener el NameUser de la colección Users basado en el ID del seguidor
		bson.M{"$lookup": bson.M{
			"from":         "Users",        // Colección Users
			"localField":   "followerId",   // ID convertido del seguidor
			"foreignField": "_id",          // Campo _id de la colección Users
			"as":           "FollowerInfo", // Nombre del campo para la información del usuario
		}},
		// 7. Descomponemos el array FollowerInfo para obtener el primer documento
		bson.M{"$unwind": bson.M{
			"path":                       "$FollowerInfo",
			"preserveNullAndEmptyArrays": true, // En caso de que no haya coincidencia
		}},
		// 8. Ordenamos los resultados por la fecha de 'since' en orden descendente
		bson.M{"$sort": bson.M{"Followers.v.since": -1}},
		// 9. Aplicamos el skip para la paginación
		bson.M{"$skip": skip},
		// 10. Aplicamos el limit para limitar la cantidad de resultados
		bson.M{"$limit": limit},
		// 11. Proyectamos los campos finales que queremos devolver
		bson.M{"$project": bson.M{
			"Email":         "$Followers.v.Email",
			"since":         "$Followers.v.since",
			"notifications": "$Followers.v.notifications",
			"NameUser":      "$FollowerInfo.NameUser", // Nombre del seguidor
			"Avatar":        "$FollowerInfo.Avatar",   // Nombre del seguidor

		}},
	}

	// Ejecutamos el pipeline de agregación
	cursor, err := GoMongoDBCollUsers.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var results []domain.FollowInfoRes
	for cursor.Next(context.Background()) {
		var followInfo domain.FollowInfoRes
		if err := cursor.Decode(&followInfo); err != nil {
			return nil, err
		}
		results = append(results, followInfo)
	}

	// Revisamos si hubo error en el cursor
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

func (u *UserRepository) UpdateLastConnection(userID primitive.ObjectID) error {
	db := u.mongoClient.Database("NEXO-VECINAL")
	usersCollection := db.Collection("Users")

	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"LastConnection": time.Now(),
		},
	}

	_, err := usersCollection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}

	return nil
}

func (u *UserRepository) FindEmailForOauth2Updata(user *domain.Google_callback_Complete_Profile_And_Username) (*domain.User, error) {
	NameUserLower := strings.ToLower(user.NameUser)
	_, err := u.FindNameUser(NameUserLower, "")
	if err != nil {
		if err != mongo.ErrNoDocuments {
			return nil, err
		}
		GoMongoDBColl := u.mongoClient.Database("NEXO-VECINAL")

		GoMongoDBCollUsers := GoMongoDBColl.Collection("Users")
		GoMongoDBCollStreams := GoMongoDBColl.Collection("Streams")

		filter := bson.M{"Email": user.Email}

		var existingUser *domain.User
		err = GoMongoDBCollUsers.FindOne(context.Background(), filter).Decode(&existingUser)
		if err != nil {
			return nil, err
		}
		if existingUser.NameUser != "" {
			return nil, errors.New("NameUser exists")
		}

		update := bson.M{
			"$set": bson.M{
				"NameUser":     user.NameUser,
				"PasswordHash": user.Password,
				"Email":        user.Email,
				"Pais":         user.Pais,
				"Ciudad":       user.Ciudad,
				"Biography":    user.Biography,
				"HeadImage":    user.HeadImage,
				"BirthDate":    user.BirthDate,
				"Sex":          user.Sex,
				"Situation":    user.Situation,
				"ZodiacSign":   user.ZodiacSign,
			},
		}

		// Realizar la actualización
		_, err = GoMongoDBCollUsers.UpdateOne(context.Background(), filter, update)

		if err != nil {
			return nil, err
		}
		filterStream := bson.M{"StreamerID": existingUser.ID}
		updateStream := bson.M{
			"$set": bson.M{
				"Streamer": user.NameUser,
			},
		}

		_, err = GoMongoDBCollStreams.UpdateOne(context.Background(), filterStream, updateStream)

		if err != nil {
			return nil, err
		}
		return existingUser, nil
	}
	return nil, errors.New("nameuser exist")

}
func (u *UserRepository) EditProfile(profile domain.EditProfile, id primitive.ObjectID) error {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	var existingUser struct {
		EditProfiile struct {
			Biography time.Time `bson:"Biography,omitempty"`
		} `bson:"EditProfiile"`
	}

	filter := bson.M{"_id": id}
	err := GoMongoDBCollUsers.FindOne(context.TODO(), filter).Decode(&existingUser)
	if err != nil {
		return err
	}

	// timeSinceLastChange := time.Since(existingUser.EditProfiile.Biography)
	// if timeSinceLastChange < 15*24*time.Hour {
	// 	return fmt.Errorf("no puedes actualizar la biografía hasta que pasen 60 días desde el último cambio")
	// }

	update := bson.M{
		"$set": bson.M{
			"Pais":                   profile.Pais,
			"Ciudad":                 profile.Ciudad,
			"Biography":              profile.Biography,
			"EditProfiile.Biography": time.Now(),
			"HeadImage":              profile.HeadImage,
			"BirthDate":              profile.BirthDateTime,
			"Sex":                    profile.Sex,
			"Situation":              profile.Situation,
			"ZodiacSign":             profile.ZodiacSign,
		},
	}

	_, err = GoMongoDBCollUsers.UpdateOne(context.TODO(), filter, update)
	return err
}

func (u *UserRepository) EditPasswordHast(passwordHash string, id primitive.ObjectID) error {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"PasswordHash": passwordHash,
		},
	}
	_, err := GoMongoDBCollUsers.UpdateOne(context.TODO(), filter, update)
	return err
}
func (u *UserRepository) EditAvatar(avatar string, id primitive.ObjectID) error {
	GoMongoDB := u.mongoClient.Database("NEXO-VECINAL")
	GoMongoDBCollUsers := GoMongoDB.Collection("Users")

	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"Avatar": avatar,
		},
	}
	_, err := GoMongoDBCollUsers.UpdateOne(context.TODO(), filter, update)
	if err != nil {
		return err
	}
	return err
}
func (u *UserRepository) EditBanner(Banner string, id primitive.ObjectID) error {
	GoMongoDB := u.mongoClient.Database("NEXO-VECINAL")
	GoMongoDBCollStreams := GoMongoDB.Collection("Users")
	filterStream := bson.M{"_id": id}
	updateStream := bson.M{
		"$set": bson.M{
			"Banner": Banner,
		},
	}

	_, err := GoMongoDBCollStreams.UpdateOne(context.TODO(), filterStream, updateStream)

	return err
}
func (u *UserRepository) RedisSaveAccountRecoveryCode(code string, user domain.User) error {
	userJSON, errMarshal := json.Marshal(user)
	if errMarshal != nil {
		return errMarshal
	}

	err := u.redisClient.Set(context.Background(), code, userJSON, 5*time.Minute).Err()

	return err
}

func (u *UserRepository) RedisSaveChangeGoogleAuthenticatorCode(code string, user domain.User) error {
	userJSON, errMarshal := json.Marshal(user)
	if errMarshal != nil {
		return errMarshal
	}

	err := u.redisClient.Set(context.Background(), code, userJSON, 5*time.Minute).Err()

	return err
}

func (u *UserRepository) RedisGetChangeGoogleAuthenticatorCode(code string) (*domain.User, error) {

	userJSON, errGet := u.redisClient.Get(context.Background(), code).Result()
	if errGet != nil {
		return nil, errGet
	}

	var user domain.User
	errUnmarshal := json.Unmarshal([]byte(userJSON), &user)
	if errUnmarshal != nil {
		return nil, errUnmarshal
	}

	_, errDel := u.redisClient.Del(context.Background(), code).Result()
	if errDel != nil {
		return &user, nil
	}
	return &user, nil
}

func (u *UserRepository) getUser(filter bson.D) (*userdomain.GetUser, error) {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	currentTime := time.Now()

	pipeline := mongo.Pipeline{
		// Filtra el usuario basado en el filtro proporcionado
		bson.D{{Key: "$match", Value: filter}},
		// Agrega campos adicionales como FollowersCount, FollowingCount, SubscribersCount
		bson.D{{Key: "$addFields", Value: bson.D{
			{Key: "FollowersCount", Value: bson.D{
				{Key: "$size", Value: bson.D{
					{Key: "$ifNull", Value: bson.A{
						bson.D{{Key: "$objectToArray", Value: "$Followers"}},
						bson.A{},
					}},
				}},
			}},
			{Key: "FollowingCount", Value: bson.D{
				{Key: "$size", Value: bson.D{
					{Key: "$ifNull", Value: bson.A{
						bson.D{{Key: "$objectToArray", Value: "$Following"}},
						bson.A{},
					}},
				}},
			}},
			{Key: "SubscribersCount", Value: bson.D{
				{Key: "$size", Value: bson.D{
					{Key: "$ifNull", Value: bson.A{"$Subscribers", bson.A{}}},
				}},
			}},
		}}},
		// Realiza un lookup en la colección de suscripciones
		bson.D{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Subscriptions"},
			{Key: "let", Value: bson.D{{Key: "userID", Value: "$_id"}}}, // Pasa el ID del usuario actual
			{Key: "pipeline", Value: mongo.Pipeline{
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "$expr", Value: bson.D{
						{Key: "$and", Value: bson.A{
							bson.D{{Key: "$eq", Value: bson.A{"$destinationUserID", "$$userID"}}}, // Coincide el userID con el destinationUserID
							bson.D{{Key: "$gt", Value: bson.A{"$SubscriptionEnd", currentTime}}},  // Verifica que la suscripción esté activa
						}},
					}},
				}}},
				bson.D{{Key: "$count", Value: "activeSubscriptionsCount"}},
			}},
			{Key: "as", Value: "SubscriptionData"},
		}}},
		// Agrega el SubscriptionCount desde SubscriptionData
		bson.D{{Key: "$addFields", Value: bson.D{
			{Key: "SubscriptionCount", Value: bson.D{
				{Key: "$ifNull", Value: bson.A{
					bson.D{{Key: "$arrayElemAt", Value: bson.A{"$SubscriptionData.activeSubscriptionsCount", 0}}},
					0,
				}},
			}},
		}}},
		// Proyección para excluir campos innecesarios
		bson.D{{Key: "$project", Value: bson.D{
			{Key: "Followers", Value: 0},
			{Key: "Subscribers", Value: 0},
			{Key: "SubscriptionData", Value: 0}, // Excluir los datos de lookup
		}}},
	}

	cursor, err := GoMongoDBCollUsers.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var user domain.GetUser
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
	}

	return &user, nil
}
func (u *UserRepository) getFullUserInternalOperations(filter bson.D) (*domain.User, error) {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
		bson.D{{Key: "$project", Value: bson.D{
			{Key: "Followers", Value: 0},
			{Key: "Subscribers", Value: 0},
			{Key: "ClipsComment", Value: 0},
			{Key: "Following", Value: 0},
			{Key: "ClipsLikes", Value: 0},
			{Key: "Subscriptions", Value: 0},
		}}},
	}

	cursor, err := GoMongoDBCollUsers.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var user domain.User
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
	} else {
		// Si no se encuentra un usuario, devuelve mongo.ErrNoDocuments
		return nil, mongo.ErrNoDocuments
	}

	return &user, nil
}

func (u *UserRepository) getFullUser(filter bson.D) (*domain.User, error) {
	GoMongoDBCollUsers := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
		bson.D{{Key: "$addFields", Value: bson.D{
			{Key: "FollowersCount", Value: bson.D{
				{Key: "$size", Value: bson.D{
					{Key: "$objectToArray", Value: bson.D{
						{Key: "$ifNull", Value: bson.A{"$Followers", bson.D{}}},
					}},
				}},
			}},
		}}},
		bson.D{{Key: "$project", Value: bson.D{
			{Key: "Followers", Value: 0}, // Excluir el campo Followers si es necesario

			{Key: "Subscribers", Value: 0}, //new
			{Key: "PasswordHash", Value: 0},

			{Key: "TOTPSecret", Value: 0},
			{Key: "ClipsComment", Value: 0},
			{Key: "Following", Value: 0},
			{Key: "ClipsLikes", Value: 0},
			{Key: "Subscriptions", Value: 0},
		}}},
	}

	cursor, err := GoMongoDBCollUsers.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var user domain.User
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
	} else {
		return nil, mongo.ErrNoDocuments
	}

	return &user, nil
}
func (u *UserRepository) getActiveSubscriptions(userID primitive.ObjectID) (int, error) {
	GoMongoDBCollSubscriptions := u.mongoClient.Database("NEXO-VECINAL").Collection("Subscriptions")

	currentTime := time.Now()

	pipeline := mongo.Pipeline{
		bson.D{
			{Key: "$match", Value: bson.D{
				{Key: "destinationUserID", Value: userID},
				{Key: "SubscriptionEnd", Value: bson.D{{Key: "$gt", Value: currentTime}}}, // Filtra solo suscripciones activas
			}},
		},
		bson.D{
			{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "activeSubscriptionsCount", Value: bson.D{{Key: "$sum", Value: 1}}},
			}},
		},
	}

	cursor, err := GoMongoDBCollSubscriptions.Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var result struct {
		ActiveSubscriptionsCount int `bson:"activeSubscriptionsCount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, err
		}
	}

	return result.ActiveSubscriptionsCount, nil
}

func (u *UserRepository) GetFollowsUser(ctx context.Context, idT primitive.ObjectID, userCollection *mongo.Collection) ([]primitive.ObjectID, error) {

	// Pipeline para obtener los usuarios seguidos por el usuario actual (idT)
	userPipeline := bson.A{
		bson.D{{Key: "$match", Value: bson.M{"_id": idT}}},
		bson.D{{Key: "$project", Value: bson.D{
			{Key: "Following", Value: bson.D{{Key: "$objectToArray", Value: "$Following"}}},
		}}},

		bson.D{{Key: "$unwind", Value: "$Following"}},
		bson.D{{Key: "$limit", Value: 100}},
		bson.D{{Key: "$project", Value: bson.D{
			{Key: "Following.k", Value: 1},
		}}},
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{}},
			{Key: "followingIDs", Value: bson.D{{Key: "$push", Value: "$Following.k"}}},
		}}},
	}

	// Obtener la lista de usuarios seguidos
	cursor, err := userCollection.Aggregate(ctx, userPipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var userResult struct {
		FollowingIDs []primitive.ObjectID `bson:"followingIDs"`
	}
	if cursor.Next(ctx) {
		if err := cursor.Decode(&userResult); err != nil {
			return nil, err
		}
	}

	return userResult.FollowingIDs, nil
}

func (u *UserRepository) SaveUserRedis(User *domain.User) (string, error) {

	code := helpers.GenerateRandomCode()

	// Convertir el usuario a formato JSON
	userJSON, errMarshal := json.Marshal(User)
	if errMarshal != nil {
		return "", errMarshal
	}

	// Almacenar en Redis con clave como el código
	errSet := u.redisClient.Set(context.Background(), code, userJSON, 5*time.Minute).Err()
	if errSet != nil {
		return "", errSet
	}
	return code, nil
}

// func (r *UserRepository) UpdatePinkkerProfitPerMonthRegisterLinkReferent(source string) error {
// 	GoMongoDB := r.mongoClient.Database("NEXO-VECINAL")
// 	GoMongoDBCollMonthly := GoMongoDB.Collection("PinkkerProfitPerMonth")
// 	ctx := context.Background()
// 	currentTime := time.Now()
// 	currentMonth := int(currentTime.Month())
// 	currentYear := currentTime.Year()
// 	currentDay := helpers.GetDayOfMonth(currentTime) // Por ejemplo, "15"
// 	startOfMonth := time.Date(currentYear, time.Month(currentMonth), 1, 0, 0, 0, 0, time.UTC)
// 	startOfNextMonth := time.Date(currentYear, time.Month(currentMonth+1), 1, 0, 0, 0, 0, time.UTC)

// 	monthlyFilter := bson.M{
// 		"timestamp": bson.M{
// 			"$gte": startOfMonth,
// 			"$lt":  startOfNextMonth,
// 		},
// 	}

// 	// Paso 1: Inserta el documento si no existe, inicializando valores básicos
// 	_, err := GoMongoDBCollMonthly.UpdateOne(ctx, monthlyFilter, bson.M{
// 		"$setOnInsert": bson.M{
// 			"timestamp":          currentTime,
// 			"days." + currentDay: PinkkerProfitPerMonthdomain.NewDefaultDay(),
// 		},
// 	}, options.Update().SetUpsert(true))
// 	if err != nil {
// 		return err
// 	}

// 	// Paso 2: Inicializa 'days.currentDay.userRegistrations' si no existe
// 	monthlyUpdateEnsureDay := bson.M{
// 		"$setOnInsert": bson.M{
// 			"days." + currentDay + ".UserRegistrations": bson.M{}, // Solo lo inicializa si no existe
// 		},
// 	}

// 	_, err = GoMongoDBCollMonthly.UpdateOne(ctx, monthlyFilter, monthlyUpdateEnsureDay)
// 	if err != nil {
// 		return err
// 	}

// 	// Paso 3: Incrementa el conteo de registros por fuente
// 	monthlyUpdate := bson.M{
// 		"$inc": bson.M{
// 			"days." + currentDay + ".UserRegistrations." + source: 1, // Incrementa el registro por la fuente dada
// 		},
// 	}
// 	_, err = GoMongoDBCollMonthly.UpdateOne(ctx, monthlyFilter, monthlyUpdate)
// 	if err != nil {
// 		return err
// 	}

//		return nil
//	}
func (u *UserRepository) UpdateUserBiography(ctx context.Context, id primitive.ObjectID, newBiography string) error {
	// Validar la longitud de la biografía
	if len(newBiography) < 10 || len(newBiography) > 100 {
		return fmt.Errorf("la biografía debe tener entre 10 y 100 caracteres")
	}

	user := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	// Crear el filtro y la actualización a aplicar
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"Biography":              newBiography,
			"EditProfiile.Biography": time.Now(),
		},
	}

	// Ejecutar la actualización
	result, err := user.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("error al actualizar la biografía: %v", err)
	}

	// Si no se encontró ningún documento, se retorna un error
	if result.MatchedCount == 0 {
		return errors.New("usuario no encontrado")
	}

	return nil
}
func (u *UserRepository) AutCodeSupport(id primitive.ObjectID, code string) error {
	db := u.mongoClient.Database("NEXO-VECINAL")
	collectionUsers := db.Collection("Users")
	var User domain.User

	err := collectionUsers.FindOne(context.Background(), bson.M{"_id": id}).Decode(&User)
	if err != nil {
		return err
	}

	if User.PanelAdminNexoVecinal.Level != 2 || User.PanelAdminNexoVecinal.Code != "bruno" {
		return fmt.Errorf("usuario no autorizado")
	}
	return nil
}

// IsSupportAgent verifica si el usuario con el ID indicado es un agente de soporte.
// Se asume que el campo "Soporte" de domain.User almacena el estado del soporte,
// donde el valor "activo" indica que el agente está disponible.
func (u *UserRepository) IsSupportAgent(ctx context.Context, id primitive.ObjectID) (bool, error) {
	db := u.mongoClient.Database("NEXO-VECINAL")
	collectionUsers := db.Collection("Users")
	var user domain.User

	err := collectionUsers.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return false, err
	}
	return user.Soporte == "activo", nil
}
func (u *UserRepository) IsSupportActive(ctx context.Context, id primitive.ObjectID) (bool, error) {
	return u.IsSupportAgent(ctx, id)
}

// AssignSupportAgent verifica si el usuario tiene asignado un agente de soporte y, si no es así,
// selecciona uno al azar entre los agentes con soporte activo y lo asigna al usuario.
func (u *UserRepository) AssignSupportAgent(ctx context.Context, userID primitive.ObjectID) (primitive.ObjectID, error) {
	db := u.mongoClient.Database("NEXO-VECINAL")
	collection := db.Collection("Users")

	// Buscar al usuario
	var user domain.User
	err := collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to find user: %v", err)
	}

	// Si ya tiene asignado un agente, lo devolvemos.
	if user.SoporteAssigned != primitive.NilObjectID {
		return user.SoporteAssigned, nil
	}

	// Buscar agentes de soporte activos.
	filter := bson.M{"Soporte": "activo"}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to find support agents: %v", err)
	}
	defer cursor.Close(ctx)

	var agents []domain.User
	for cursor.Next(ctx) {
		var agent domain.User
		if err := cursor.Decode(&agent); err != nil {
			return primitive.NilObjectID, fmt.Errorf("failed to decode support agent: %v", err)
		}
		agents = append(agents, agent)
	}
	if err = cursor.Err(); err != nil {
		return primitive.NilObjectID, fmt.Errorf("cursor error: %v", err)
	}
	if len(agents) == 0 {
		return primitive.NilObjectID, fmt.Errorf("no support agents available")
	}

	// Selecciona aleatoriamente un agente.
	rand.Seed(time.Now().UnixNano())
	selected := agents[rand.Intn(len(agents))]

	// Actualiza el usuario asignándole el agente seleccionado.
	update := bson.M{"$set": bson.M{"soporteassigned": selected.ID}}
	_, err = collection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to update user with assigned support: %v", err)
	}

	return selected.ID, nil
}
func (u *UserRepository) GetSupportAgent(ctx context.Context, userID primitive.ObjectID) (*domain.User, error) {
	db := u.mongoClient.Database("NEXO-VECINAL")
	collection := db.Collection("Users")

	// Buscar al usuario
	var user domain.User
	err := collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %v", err)
	}

	// Si ya tiene asignado un agente, buscamos y devolvemos su información completa.
	if !user.SoporteAssigned.IsZero() {
		var supportAgent domain.User
		err = collection.FindOne(ctx, bson.M{"_id": user.SoporteAssigned}).Decode(&supportAgent)
		if err != nil {
			return nil, fmt.Errorf("failed to find assigned support agent: %v", err)
		}
		return &supportAgent, nil
	}

	// Buscar agentes de soporte activos.
	filter := bson.M{"Soporte": "activo"}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find support agents: %v", err)
	}
	defer cursor.Close(ctx)

	var agents []domain.User
	for cursor.Next(ctx) {
		var agent domain.User
		if err := cursor.Decode(&agent); err != nil {
			return nil, fmt.Errorf("failed to decode support agent: %v", err)
		}
		agents = append(agents, agent)
	}
	if err = cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	if len(agents) == 0 {
		return nil, fmt.Errorf("no support agents available")
	}

	// Selecciona aleatoriamente un agente.
	rand.Seed(time.Now().UnixNano())
	selected := agents[rand.Intn(len(agents))]

	// Actualiza el usuario asignándole el agente seleccionado.
	update := bson.M{"$set": bson.M{"soporteassigned": selected.ID}}
	_, err = collection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		return nil, fmt.Errorf("failed to update user with assigned support: %v", err)
	}

	return &selected, nil
}
func (u *UserRepository) SaveLocationTags(userID primitive.ObjectID, location userdomain.ReqLocationTags) error {
	ctx := context.Background()
	usersCollection := u.mongoClient.Database("NEXO-VECINAL").Collection("Users")
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"location": location.Location,
			"ratio":    location.Ratio,
			"tags":     location.Tags,
		},
	}

	_, err := usersCollection.UpdateOne(ctx, filter, update)
	return err
}

// GetFilteredUsers retorna los usuarios que cumplan con los filtros:
// - Ubicación cerca del punto dado (dentro de maxDistance en metros)
// - Ratio mayor o igual a minRatio
// - Que tengan al menos uno de los tags en requiredTags
// - Que tengan la suscripción Prime activa (SubscriptionEnd > ahora)
// Se proyectan únicamente: _id, NameUser y Avatar.
func (ur *UserRepository) GetFilteredUsers(ReqLocationTags userdomain.ReqLocationTags) ([]userdomain.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usersCollection := ur.mongoClient.Database("NEXO-VECINAL").Collection("Users")

	// Construir el filtro para la ubicación usando el operador $near
	locationFilter := bson.M{
		"location": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        ReqLocationTags.Location.Type,
					"coordinates": ReqLocationTags.Location.Coordinates,
				},
				"$maxDistance": ReqLocationTags.Ratio,
			},
		},
	}

	// Filtro para el ratio
	ratioFilter := bson.M{
		"Ratio": bson.M{
			"$gte": ReqLocationTags.Ratio,
		},
	}

	// Filtro para tags: que al menos uno de los tags requeridos esté en el array
	tagsFilter := bson.M{
		"tags": bson.M{
			"$in": ReqLocationTags.Tags,
		},
	}

	// Filtro para Prime activo: se asume que la suscripción es activa si la fecha de finalización es mayor a ahora.
	primeFilter := bson.M{
		"Premium.SubscriptionEnd": bson.M{
			"$gt": time.Now(),
		},
	}

	// Combinar los filtros
	filter := bson.M{
		"$and": []bson.M{locationFilter, ratioFilter, tagsFilter, primeFilter},
	}

	// Proyección: solo _id, NameUser y Avatar
	projection := bson.M{
		"_id":      1,
		"NameUser": 1,
		"Avatar":   1,
	}
	opts := options.Find().SetProjection(projection)

	cursor, err := usersCollection.Find(ctx, filter, opts)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []userdomain.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}
