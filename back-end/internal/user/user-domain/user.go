package userdomain

import (
	"regexp"
	"time"

	"github.com/go-playground/validator"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GeoPoint representa una ubicación en formato GeoJSON.
type GeoPoint struct {
	Type        string    `bson:"type" json:"type"`               // Siempre "Point"
	Coordinates []float64 `bson:"coordinates" json:"coordinates"` // [longitud, latitud]
}
type User struct {
	ID           primitive.ObjectID     `json:"id" bson:"_id,omitempty"`
	Avatar       string                 `json:"Avatar" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"Avatar"`
	FullName     string                 `json:"FullName" bson:"FullName"`
	NameUser     string                 `json:"NameUser" bson:"NameUser"`
	PasswordHash string                 `json:"passwordHash" bson:"PasswordHash"`
	Pais         string                 `json:"Pais" bson:"Pais"`
	Ciudad       string                 `json:"Ciudad" bson:"Ciudad"`
	Email        string                 `json:"Email" bson:"Email"`
	Biography    string                 `json:"biography" default:"Bienvenido a nexo-vecinal! actualiza tu biografía en ajustes de cuenta." bson:"Biography"`
	Look         string                 `json:"look" default:"h_std_cc_3032_7_0-undefined-undefined.ch-215-62-78.hd-180-10.lg-270-110" bson:"Look"`
	LookImage    string                 `json:"lookImage" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"LookImage"`
	Banner       string                 `json:"Banner"  bson:"Banner"`
	HeadImage    string                 `json:"headImage" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"headImage"`
	BirthDate    time.Time              `json:"birthDate" bson:"BirthDate"`
	CountryInfo  map[string]interface{} `json:"countryInfo,omitempty" bson:"CountryInfo"`
	Partner      struct {
		Active bool      `json:"active,omitempty" bson:"Active,omitempty"`
		Date   time.Time `json:"date,omitempty" bson:"Date,omitempty"`
	} `json:"Partner,omitempty" bson:"Partner"`
	EditProfiile struct {
		NameUser  time.Time `json:"NameUser,omitempty" bson:"NameUser,omitempty"`
		Biography time.Time `json:"Biography,omitempty" bson:"Biography,omitempty"`
	} `json:"EditProfiile,omitempty" bson:"EditProfiile"`
	SocialNetwork struct {
		Facebook  string `json:"facebook,omitempty" bson:"facebook"`
		Twitter   string `json:"twitter,omitempty" bson:"twitter"`
		Instagram string `json:"instagram,omitempty" bson:"instagram"`
		Youtube   string `json:"youtube,omitempty" bson:"youtube"`
		Tiktok    string `json:"tiktok,omitempty" bson:"tiktok"`
		Website   string `json:"website,omitempty" bson:"Website"`
	} `json:"socialnetwork,omitempty" bson:"socialnetwork"`
	Verified              bool                              `json:"verified,omitempty" bson:"Verified"`
	Phone                 string                            `json:"phone,omitempty" bson:"Phone"`
	Gender                string                            `json:"Gender,omitempty" bson:"Gender"`
	Situation             string                            `json:"situation,omitempty" bson:"Situation"`
	Following             map[primitive.ObjectID]FollowInfo `json:"Following" bson:"Following"`
	Followers             map[primitive.ObjectID]FollowInfo `json:"Followers" bson:"Followers"`
	Timestamp             time.Time                         `json:"Timestamp" bson:"Timestamp"`
	Banned                bool                              `json:"Banned" bson:"Banned"`
	TOTPSecret            string                            `json:"TOTPSecret" bson:"TOTPSecret"`
	LastConnection        time.Time                         `json:"LastConnection" bson:"LastConnection"`
	Premium               Premium                           `json:"Premium" bson:"Premium"`
	PanelAdminNexoVecinal struct {
		Level int       `json:"Level,omitempty" bson:"Level" default:"0"`
		Asset bool      `json:"Asset,omitempty" bson:"Asset,omitempty" default:"false"`
		Code  string    `json:"Code,omitempty" bson:"Code"`
		Date  time.Time `json:"date,omitempty" bson:"Date,omitempty"`
	} `json:"PanelAdminNexoVecinal,omitempty" bson:"PanelAdminNexoVecinal"`
	CompletedJobs   int                `json:"completedJobs" bson:"completedJobs"`
	Soporte         string             `json:"Soporte" bson:"Soporte"`
	SoporteAssigned primitive.ObjectID `bson:"soporteassigned"`
	PushToken       string             `json:"pushToken" bson:"pushToken"`
	Tags            []string           `json:"tags" bson:"tags"`
	Location        GeoPoint           `json:"location" bson:"location"`
	Ratio           float64            `json:"Ratio" bson:"ratio"`
}

type Premium struct {
	MonthsSubscribed  int       `bson:"MonthsSubscribed"`
	SubscriptionStart time.Time `bson:"SubscriptionStart"`
	SubscriptionEnd   time.Time `bson:"SubscriptionEnd"`
}
type FollowInfo struct {
	Since         time.Time `json:"since" bson:"since"`
	Notifications bool      `json:"notifications" bson:"notifications"`
	Email         string    `json:"Email" bson:"Email"`
}

type FollowInfoRes struct {
	Since         time.Time `json:"since" bson:"since"`
	Notifications bool      `json:"notifications" bson:"notifications"`
	Email         string    `json:"Email" bson:"Email"`
	NameUser      string    `json:"NameUser" bson:"NameUser"`
	Avatar        string    `json:"Avatar" bson:"Avatar"`
}

type UserModelValidator struct {
	FullName      string    `json:"fullName" validate:"required,min=5,max=70"`
	NameUser      string    `json:"nameUser" validate:"nameuser"`
	Password      string    `json:"password" validate:"required,min=8"`
	Pais          string    `json:"Pais" `
	Ciudad        string    `json:"Ciudad"`
	Email         string    `json:"email" validate:"required,email"`
	Instagram     string    `json:"instagram" default:""`
	Twitter       string    `json:"twitter" default:""`
	Youtube       string    `json:"youtube" default:""`
	Wallet        string    `json:"Wallet" default:""`
	BirthDate     string    `json:"BirthDate" default:""`
	BirthDateTime time.Time `json:"-" bson:"BirthDate"`
	Gender        string    `json:"Gender,omitempty" bson:"Gender"`
}

func (u *UserModelValidator) ValidateUser() error {
	validate := validator.New()

	validate.RegisterValidation("nameuser", nameUserValidator)

	if u.BirthDate != "" {
		_, err := time.Parse("2006-01-02", u.BirthDate)
		if err != nil {
			return err
		}

		birthDate, _ := time.Parse("2006-01-02", u.BirthDate)
		u.BirthDateTime = birthDate
	}

	return validate.Struct(u)
}

type SocialNetwork struct {
	Facebook  string `json:"facebook,omitempty" bson:"facebook"`
	Twitter   string `json:"twitter,omitempty" bson:"twitter"`
	Instagram string `json:"instagram,omitempty" bson:"instagram"`
	Youtube   string `json:"youtube,omitempty" bson:"youtube"`
	Tiktok    string `json:"tiktok,omitempty" bson:"tiktok"`
}

type PanelAdminPinkkerInfoUserReq struct {
	Code     string             `json:"Code,omitempty" bson:"Code"`
	IdUser   primitive.ObjectID `json:"IdUser,omitempty" bson:"IdUser"`
	NameUser string             `json:"NameUser,omitempty" bson:"NameUser"`
}
type CreateAdmin struct {
	Code     string             `json:"Code,omitempty" bson:"Code"`
	IdUser   primitive.ObjectID `json:"IdUser,omitempty" bson:"IdUser"`
	NameUser string             `json:"NameUser,omitempty" bson:"NameUser"`
	Level    int                `json:"Level,omitempty" bson:"Level"`
	NewCode  string             `json:"NewCode,omitempty" bson:"NewCode" validate:"required,min=5,max=20" `
}
type ChangeNameUser struct {
	Code           string             `json:"Code,omitempty" bson:"Code" `
	IdUser         primitive.ObjectID `json:"IdUser,omitempty" bson:"IdUser"`
	NameUserNew    string             `json:"NameUserNew,omitempty" bson:"NameUserNew" validate:"NameUserNew"`
	NameUserRemove string             `json:"NameUserRemove,omitempty" bson:"NameUserRemove"`
}

func nameUserValidator(fl validator.FieldLevel) bool {
	nameUser := fl.Field().String()

	// Verifica la longitud
	if len(nameUser) < 3 || len(nameUser) > 20 {
		return false
	}

	// Verifica que solo contenga caracteres alfanuméricos
	if !regexp.MustCompile(`^[a-zA-Z0-9]+$`).MatchString(nameUser) {
		return false
	}

	return true
}

// Valida la estructura
func (u *ChangeNameUser) ValidateUser() error {
	validate := validator.New()

	// Registro de validación personalizada
	validate.RegisterValidation("NameUserNew", nameUserValidator)

	// Validar estructura con la etiqueta personalizada
	return validate.Struct(u)
}

type ReqGoogle_callback_NameUserConfirm struct {
	NameUser string `json:"NameUser" validate:"required,min=5,max=20"`
	Pais     string `json:"Pais" validate:"required"`
	Ciudad   string `json:"Ciudad" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
}

func (u *ReqGoogle_callback_NameUserConfirm) ValidateUser() error {
	validate := validator.New()
	return validate.Struct(u)
}

type LoginValidatorStruct struct {
	NameUser string `json:"NameUser" validate:"required,max=70"`
	Password string `json:"password" validate:"required,min=8"`
}
type LoginTOTPSecret struct {
	NameUser string `json:"NameUser" validate:"required,max=70"`
	Password string `json:"password" validate:"required,min=8"`
	Totpcode string `json:"totp_code" `
}

func (L *LoginTOTPSecret) LoginTOTPSecret() error {
	validate := validator.New()
	return validate.Struct(L)
}

func (L *LoginValidatorStruct) LoginValidator() error {
	validate := validator.New()
	return validate.Struct(L)
}

type Req_Recover_lost_password struct {
	Mail string `json:"mail" validate:"required,max=70"`
}
type ReqRestorePassword struct {
	Code     string `json:"code"`
	Password string `json:"password" validate:"required,min=8"`
}
type DeleteGoogleAuthenticator struct {
	Code string `json:"code"`
}
type GetRecommended struct {
	ExcludeIDs []primitive.ObjectID `json:"ExcludeIDs" validate:"required"`
}
type GetUser struct {
	ID       primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Avatar   string             `json:"Avatar" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"Avatar"`
	FullName string             `json:"FullName" bson:"FullName"`
	NameUser string             `json:"NameUser" bson:"NameUser"`
	Pais     string             `json:"Pais" bson:"Pais"`
	// Subscriptions   []primitive.ObjectID   `bson:"Subscriptions"`
	// Subscribers     []primitive.ObjectID   `bson:"Subscribers"`
	// Clips           []primitive.ObjectID   `bson:"Clips,omitempty"`
	// ClipsLikes      []primitive.ObjectID   `bson:"ClipsLikes,omitempty"`
	Ciudad          string                 `json:"Ciudad" bson:"Ciudad"`
	Email           string                 `json:"Email" bson:"Email"`
	Role            int                    `json:"role" bson:"Role,default:0"`
	KeyTransmission string                 `json:"keyTransmission,omitempty" bson:"KeyTransmission"`
	Biography       string                 `json:"biography" default:"Bienvenido a pinkker! actualiza tu biografía en ajustes de cuenta." bson:"Biography"`
	Look            string                 `json:"look" default:"h_std_cc_3032_7_0-undefined-undefined.ch-215-62-78.hd-180-10.lg-270-110" bson:"Look"`
	LookImage       string                 `json:"lookImage" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"LookImage"`
	Banner          string                 `json:"Banner" default:"https://res.cloudinary.com/dcj8krp42/image/upload/v1712283573/categorias/logo_trazado_pndioh.png" bson:"Banner"`
	HeadImage       string                 `json:"headImage" default:"https://res.cloudinary.com/pinkker/image/upload/v1680478837/foto_default_obyind.png" bson:"headImage"`
	Online          bool                   `json:"Online" bson:"Online"`
	Color           string                 `json:"color" bson:"Color"`
	BirthDate       time.Time              `json:"birthDate" bson:"BirthDate"`
	CustomAvatar    bool                   `json:"customAvatar,omitempty" bson:"CustomAvatar"`
	CountryInfo     map[string]interface{} `json:"countryInfo,omitempty" bson:"CountryInfo"`
	Partner         struct {
		Active bool      `json:"active,omitempty" bson:"Active,omitempty"`
		Date   time.Time `json:"date,omitempty" bson:"Date,omitempty"`
	} `json:"Partner,omitempty" bson:"Partner"`
	// Suscribers    []string `json:"suscribers,omitempty" bson:"Suscribers"`
	SocialNetwork struct {
		Facebook  string `json:"facebook,omitempty" bson:"facebook"`
		Twitter   string `json:"twitter,omitempty" bson:"twitter"`
		Instagram string `json:"instagram,omitempty" bson:"instagram"`
		Youtube   string `json:"youtube,omitempty" bson:"youtube"`
		Tiktok    string `json:"tiktok,omitempty" bson:"tiktok"`
	} `json:"socialnetwork,omitempty" bson:"socialnetwork"`
	Verified                 bool   `json:"verified,omitempty" bson:"Verified"`
	Website                  string `json:"website,omitempty" bson:"Website"`
	Phone                    string `json:"phone,omitempty" bson:"Phone"`
	Gender                   string `json:"Gender,omitempty" bson:"Gender"`
	Situation                string `json:"situation,omitempty" bson:"Situation"`
	UserFriendsNotifications int    `json:"userFriendsNotifications,omitempty" bson:"UserFriendsNotifications"`
	// Following                map[primitive.ObjectID]FollowInfo `json:"Following" bson:"Following"`
	// Followers                map[primitive.ObjectID]FollowInfo `json:"Followers" bson:"Followers"`
	FollowersCount int `json:"FollowersCount" bson:"FollowersCount"`
	FollowingCount int `json:"FollowingCount" bson:"FollowingCount"`

	SubscribersCount int       `json:"SubscribersCount" bson:"SubscribersCount"`
	Timestamp        time.Time `json:"Timestamp" bson:"Timestamp"`
	// Likes                    []primitive.ObjectID              `json:"Likes" bson:"Likes"`
	Wallet string `json:"Wallet" bson:"Wallet"`
	// ClipsComment             []primitive.ObjectID              `json:"ClipsComment" bson:"ClipsComment"`
	CategoryPreferences map[string]float64   `json:"categoryPreferences" bson:"categoryPreferences"`
	Banned              bool                 `json:"Banned" bson:"Banned"`
	IsFollowedByUser    bool                 `json:"isFollowedByUser" bson:"isFollowedByUser"`
	InCommunities       []primitive.ObjectID `json:"InCommunities" bson:"InCommunities"`
}
type UserInfoOAuth2 struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}
type EditProfile struct {
	Pais      string `json:"Pais" bson:"Pais"`
	Ciudad    string `json:"Ciudad" bson:"Ciudad"`
	Biography string `json:"biography" validate:"max=600"`
	HeadImage string `json:"headImage"`

	BirthDate     string    `json:"birthDate"`
	BirthDateTime time.Time `json:"-" bson:"BirthDate"`
	Gender        string    `json:"Gender,omitempty"`
	Situation     string    `json:"situation,omitempty"`
	ZodiacSign    string    `json:"ZodiacSign,omitempty"`
}

func (u *EditProfile) ValidateEditProfile() error {
	validate := validator.New()

	if u.BirthDate != "" {
		birthDate, err := time.Parse("2006-01-02", u.BirthDate)
		if err != nil {
			return err
		}
		u.BirthDateTime = birthDate
	}

	return validate.Struct(u)
}

type Google_callback_Complete_Profile_And_Username struct {
	NameUser   string    `json:"nameUser" validate:"nameuser,required,min=5,max=20"`
	Email      string    `json:"email" validate:"required,email"`
	Password   string    `json:"password" validate:"required,min=8"`
	Pais       string    `json:"pais" bson:"Pais"`
	Ciudad     string    `json:"ciudad" bson:"Ciudad"`
	Biography  string    `json:"biography" validate:"max=600"`
	HeadImage  string    `json:"headImage"`
	BirthDate  time.Time `json:"birthDate"`
	Gender     string    `json:"Gender,omitempty"`
	Situation  string    `json:"situation,omitempty"`
	ZodiacSign string    `json:"zodiacSign,omitempty"`
	Referral   string    `json:"referral"`
}

func (u *Google_callback_Complete_Profile_And_Username) ValidateUser() error {
	validate := validator.New()
	if u.BirthDate.IsZero() || u.BirthDate.String() == "" {
		u.BirthDate = time.Now()
	}
	validate.RegisterValidation("nameuser", nameUserValidator)

	return validate.Struct(u)
}

type InfoUserInRoom struct {
	ID       primitive.ObjectID       `json:"id" bson:"_id,omitempty"`
	NameUser string                   `json:"nameuser" bson:"NameUser"`
	Color    string                   `json:"Color" bson:"Color"`
	Rooms    []map[string]interface{} `json:"rooms" bson:"Rooms"`
}

// este documento tiene todas los Rooms o chats en los que interactuo  Nameuser
type InfoUser struct {
	ID       primitive.ObjectID       `bson:"_id,omitempty"`
	Nameuser string                   `bson:"NameUser"`
	Color    string                   `bson:"Color"`
	Rooms    []map[string]interface{} `bson:"Rooms"`
}

type EditBiography struct {
	Biography string `json:"Biography" validate:"required,min=10,max=100"`
}

func (u *UserModelValidator) Validate() error {
	validate := validator.New()

	return validate.Struct(u)
}

type ReqLocationTags struct {
	Location GeoPoint `json:"location" bson:"location" validate:"required"`
	Ratio    int64    `json:"ratio" bson:"ratio" validate:"required"`
	Tags     []string `json:"tags" bson:"tags"`
}

func (u *ReqLocationTags) Validate() error {
	validate := validator.New()
	return validate.Struct(u)
}

type ReqCodeInRedisSignup struct {
	Code       string `json:"code" validate:"-"`
	Referral   string `json:"referral" validate:"required,oneof=amigo instagram facebook"`
	Intentions string `json:"Intentions,omitempty" bson:"Intentions" validate:"required,oneof=hire work"`
}

func (u *ReqCodeInRedisSignup) Validate() error {
	validate := validator.New()
	return validate.Struct(u)
}

type RevenueCatWebhook struct {
	Event struct {
		AppUserID      string `json:"app_user_id"`
		ProductID      string `json:"product_id"`
		PurchasedAtMs  int64  `json:"purchased_at_ms"`
		ExpirationAtMs int64  `json:"expiration_at_ms"`
		Type           string `json:"type"` // Ej: "RENEWAL", "INITIAL_PURCHASE"
		Environment    string `json:"environment"`
	} `json:"event"`
}

func (u *RevenueCatWebhook) Validate() error {
	validate := validator.New()
	return validate.Struct(u)
}
