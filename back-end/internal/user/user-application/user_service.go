package userapplication

import (
	"back-end/config"
	domain "back-end/internal/user/user-domain"
	userdomain "back-end/internal/user/user-domain"
	infrastructure "back-end/internal/user/user-infrastructure"
	"back-end/pkg/authGoogleAuthenticator"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserService struct {
	roomRepository *infrastructure.UserRepository
}

func NewChatService(roomRepository *infrastructure.UserRepository) *UserService {
	return &UserService{
		roomRepository: roomRepository,
	}
}

func (u *UserService) GenerateTOTPKey(ctx context.Context, userID primitive.ObjectID, nameUser string) (string, string, error) {
	secret, url, err := authGoogleAuthenticator.GenerateKey(userID.Hex(), nameUser)
	if err != nil {
		return "", "", err
	}
	err = u.roomRepository.SetTOTPSecret(ctx, userID, secret)
	if err != nil {
		return "", "", err
	}
	return secret, url, nil
}
func (u *UserService) SavePushToken(id primitive.ObjectID, PushToken string) error {
	return u.roomRepository.SavePushToken(id, PushToken)
}

func (u *UserService) UserMetricts(user *domain.User, Intentions, Referral string) error {
	return u.roomRepository.UserMetricts(user, Intentions, Referral)
}
func (u *UserService) UserPremiumAmonth(id primitive.ObjectID) error {
	return u.roomRepository.UserPremiumExtend(id)
}
func (u *UserService) UpdateRecommendedWorkerPremium(id primitive.ObjectID) error {
	return u.roomRepository.UpdateRecommendedWorkerPremium(id)
}

func (u *UserService) ValidateTOTPCode(ctx context.Context, userID primitive.ObjectID, code string) (bool, error) {
	return u.roomRepository.ValidateTOTPCode(ctx, userID, code)
}

// signup
func (u *UserService) UserDomaionUpdata(newUser *domain.UserModelValidator, avatarUrl string, passwordHash string) *userdomain.User {
	var modelNewUser domain.User
	modelNewUser.Avatar = avatarUrl
	if modelNewUser.Avatar == "" {
		avatarConf := config.FotoPerfil()
		modelNewUser.Avatar = avatarConf
	}
	modelNewUser.NameUser = newUser.NameUser

	modelNewUser.FullName = newUser.FullName
	modelNewUser.PasswordHash = passwordHash
	modelNewUser.Banner = ""
	modelNewUser.Biography = "Biografia no configurada"
	modelNewUser.Pais = newUser.Pais
	modelNewUser.Ciudad = newUser.Ciudad
	modelNewUser.Email = newUser.Email
	modelNewUser.Timestamp = time.Now()
	modelNewUser.Followers = make(map[primitive.ObjectID]domain.FollowInfo)
	modelNewUser.Following = make(map[primitive.ObjectID]domain.FollowInfo)
	modelNewUser.Verified = false
	modelNewUser.BirthDate = newUser.BirthDateTime
	modelNewUser.PanelAdminNexoVecinal.Level = 0
	modelNewUser.PanelAdminNexoVecinal.Asset = false
	modelNewUser.PanelAdminNexoVecinal.Date = time.Now()
	modelNewUser.PanelAdminNexoVecinal.Code = ""
	modelNewUser.Banned = false
	fifteenDaysAgo := time.Now().AddDate(0, 0, -15)
	modelNewUser.EditProfiile.Biography = fifteenDaysAgo
	modelNewUser.EditProfiile.NameUser = time.Now()
	modelNewUser.Location = domain.GeoPoint{
		Type:        "Point",
		Coordinates: []float64{-64.183333, -31.416667},
	}
	modelNewUser.AvailableToWork = false
	genderMap := map[string]string{
		"Masculino": "male",
		"Femenino":  "female",
	}
	if translatedGender, exists := genderMap[newUser.Gender]; exists {
		modelNewUser.Gender = translatedGender
	} else {
		modelNewUser.Gender = newUser.Gender // Si no se encuentra, lo dejamos tal cual
	}

	return &modelNewUser
}

// signup
func (u *UserService) UserDataSignupGoogle(newUser *domain.Google_callback_Complete_Profile_And_Username, passwordHash string) *userdomain.User {
	var modelNewUser domain.User
	modelNewUser.Avatar = newUser.Avatar
	if modelNewUser.Avatar == "" {
		avatarConf := config.FotoPerfil()
		modelNewUser.Avatar = avatarConf
	}
	modelNewUser.NameUser = newUser.NameUser

	modelNewUser.FullName = newUser.FullName
	modelNewUser.PasswordHash = passwordHash
	modelNewUser.Banner = ""
	modelNewUser.Biography = "Biografia no configurada"
	modelNewUser.Pais = newUser.Pais
	modelNewUser.Ciudad = newUser.Ciudad
	modelNewUser.Email = newUser.Email
	modelNewUser.Timestamp = time.Now()
	modelNewUser.Followers = make(map[primitive.ObjectID]domain.FollowInfo)
	modelNewUser.Following = make(map[primitive.ObjectID]domain.FollowInfo)
	modelNewUser.Verified = false
	modelNewUser.BirthDate = newUser.BirthDateTime
	modelNewUser.PanelAdminNexoVecinal.Level = 0
	modelNewUser.PanelAdminNexoVecinal.Asset = false
	modelNewUser.PanelAdminNexoVecinal.Date = time.Now()
	modelNewUser.PanelAdminNexoVecinal.Code = ""
	modelNewUser.Banned = false
	fifteenDaysAgo := time.Now().AddDate(0, 0, -15)
	modelNewUser.EditProfiile.Biography = fifteenDaysAgo
	modelNewUser.EditProfiile.NameUser = time.Now()
	modelNewUser.Location = domain.GeoPoint{
		Type:        "Point",
		Coordinates: []float64{-64.183333, -31.416667},
	}
	modelNewUser.AvailableToWork = false
	genderMap := map[string]string{
		"Masculino": "male",
		"Femenino":  "female",
	}
	if translatedGender, exists := genderMap[newUser.Gender]; exists {
		modelNewUser.Gender = translatedGender
	} else {
		modelNewUser.Gender = newUser.Gender // Si no se encuentra, lo dejamos tal cual
	}

	return &modelNewUser
}
func (u *UserService) SaveUserRedis(newUser *domain.User) (string, error) {
	code, err := u.roomRepository.SaveUserRedis(newUser)
	return code, err
}
func (u *UserService) GetUserinRedis(code string) (*domain.User, error) {
	user, err := u.roomRepository.GetUserByCodeFromRedis(code)
	return user, err
}
func (u *UserService) RedisGetChangeGoogleAuthenticatorCode(code string) (*domain.User, error) {
	user, err := u.roomRepository.RedisGetChangeGoogleAuthenticatorCode(code)
	return user, err
}
func (u *UserService) SaveUser(newUser *domain.User) (primitive.ObjectID, error) {
	id, err := u.roomRepository.SaveUser(newUser)
	return id, err
}

func (u *UserService) SendConfirmationEmail(Email string, Token string) error {
	err := u.roomRepository.SendConfirmationEmail(Email, Token)
	return err
}

func (u *UserService) ConfirmationEmailToken(nameUser string) error {
	user, errFindUser := u.roomRepository.FindNameUser(nameUser, "")
	if errFindUser != nil {
		return errFindUser
	}
	errUpdateConfirmationEmailToken := u.roomRepository.UpdateConfirmationEmailToken(user)
	return errUpdateConfirmationEmailToken
}

// find

func (u *UserService) IsUserBlocked(NameUser string) (bool, error) {

	user, err := u.roomRepository.IsUserBlocked(NameUser)
	return user, err
}
func (u *UserService) HandleLoginFailure(NameUser string) error {

	return u.roomRepository.HandleLoginFailure(NameUser)

}
func (u *UserService) FindNameUser(NameUser string, Email string) (*domain.User, error) {

	user, err := u.roomRepository.FindNameUser(NameUser, Email)
	return user, err
}
func (u *UserService) FindNameUserInternalOperation(NameUser string, Email string) (*domain.User, error) {

	user, err := u.roomRepository.FindNameUserInternalOperation(NameUser, Email)
	return user, err
}

// oauth2
func (u *UserService) UserCreateSignupGoogle(user *userdomain.User) (*domain.User, error) {
	userFind, err := u.roomRepository.UserCreateSignupGoogle(user)
	return userFind, err
}

func (u *UserService) DeleteGoogleAuthenticator(id primitive.ObjectID) error {
	err := u.roomRepository.DeleteGoogleAuthenticator(id)
	return err
}

func (u *UserService) RedisSaveAccountRecoveryCode(code string, user domain.User) error {
	err := u.roomRepository.RedisSaveAccountRecoveryCode(code, user)
	return err
}

func (u *UserService) RedisSaveChangeGoogleAuthenticatorCode(code string, user domain.User) error {
	err := u.roomRepository.RedisSaveChangeGoogleAuthenticatorCode(code, user)
	return err
}
func (u *UserService) FindUserById(id primitive.ObjectID) (*domain.User, error) {
	user, err := u.roomRepository.FindUserById(id)
	return user, err
}
func (u *UserService) UpdateUserBiography(id primitive.ObjectID, req domain.EditBiography) error {
	context := context.Background()
	return u.roomRepository.UpdateUserBiography(context, id, req.Biography)
}
func (u *UserService) EditAvatar(avatarUrl string, IdUserTokenP primitive.ObjectID) error {

	err := u.roomRepository.EditAvatar(avatarUrl, IdUserTokenP)
	return err
}
func (u *UserService) SaveLocationTags(id primitive.ObjectID, location userdomain.ReqLocationTags) error {
	return u.roomRepository.SaveLocationTags(id, location)
}
func (u *UserService) GetFilteredUsers(location userdomain.ReqLocationTags) ([]userdomain.User, error) {
	return u.roomRepository.GetFilteredUsers(location)
}
func (u *UserService) FindUsersByNameTagOrLocation(
	nameUser string,
	tags []string,
	location *domain.GeoPoint,
	radiusInMeters float64,
	page int,
) ([]domain.GetUser, error) {
	return u.roomRepository.FindUsersByNameTagOrLocation(nameUser, tags, location, radiusInMeters, page)
}
