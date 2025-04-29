package userinterfaces

import (
	application "back-end/internal/user/user-application"
	domain "back-end/internal/user/user-domain"
	userdomain "back-end/internal/user/user-domain"
	oauth2 "back-end/pkg/OAuth2"
	configoauth2 "back-end/pkg/OAuth2/configOAuth2"
	"back-end/pkg/auth"
	"back-end/pkg/helpers"
	"back-end/pkg/jwt"
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserHandler struct {
	userService *application.UserService
}

func NewUserHandler(chatService *application.UserService) *UserHandler {
	return &UserHandler{
		userService: chatService,
	}
}

// ____________
// login google
func (h *UserHandler) Google_callback_Complete_Profile_And_Username(c *fiber.Ctx) error {

	var req domain.Google_callback_Complete_Profile_And_Username
	err := c.BodyParser(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"data":    err.Error(),
		})
	}
	if err = req.ValidateUser(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"data":    err.Error(),
		})
	}
	passwordHashChan := make(chan string)
	go helpers.HashPassword(req.Password, passwordHashChan)
	passwordHash := <-passwordHashChan
	req.Password = passwordHash
	user, err := h.userService.FindEmailForOauth2Updata(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"data":    err.Error(),
		})
	}
	user.NameUser = req.NameUser

	tokenRequest, err := jwt.CreateToken(user)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "token error",
			"data":    err.Error(),
		})
	}
	// err = h.userService.UpdatePinkkerProfitPerMonthRegisterLinkReferent(req.Referral)
	// if err != nil {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"message": "token error",
	// 		"data":    err.Error(),
	// 	})
	// }

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "token",
		"data":     tokenRequest,
		"_id":      user.ID,
		"avatar":   user.Avatar,
		"nameUser": user.NameUser,
	})

}
func (h *UserHandler) Google_callback(c *fiber.Ctx) error {
	code := c.Query("code")
	googleConfig := configoauth2.LoadConfig()
	token, err := googleConfig.Exchange(context.TODO(), code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}

	userInfo, err := oauth2.GetUserInfoFromGoogle(token)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}
	user, existUser := h.userService.FindNameUser(userInfo.Name, userInfo.Email)
	if existUser != nil {
		if existUser == mongo.ErrNoDocuments {
			newUser := &userdomain.UserModelValidator{
				FullName: userInfo.Name,
				NameUser: "",
				Password: "",
				Pais:     "",
				Ciudad:   "",
				Email:    userInfo.Email,
			}

			userDomaion := h.userService.UserDomaionUpdata(newUser, userInfo.Picture, "")
			_, errSaveUser := h.userService.SaveUser(userDomaion)
			if errSaveUser != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "StatusInternalServerError",
					"data":    errSaveUser.Error(),
				})
			}

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"message": "redirect to complete user",
				"data":    userInfo.Email,
			})
		}

	}

	if user.NameUser == "" {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "redirect to complete user",
			"data":    userInfo.Email,
		})
	}
	tokenRequest, err := jwt.CreateToken(user)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
			"data":    err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "token",
		"data":     tokenRequest,
		"_id":      user.ID,
		"avatar":   user.Avatar,
		"nameUser": user.NameUser,
	})
}
func (h *UserHandler) LoginTOTPSecret(c *fiber.Ctx) error {
	var DataForLogin domain.LoginTOTPSecret

	if err := c.BodyParser(&DataForLogin); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	if err := DataForLogin.LoginTOTPSecret(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	user, errGoMongoDBCollUsers := h.userService.FindNameUserInternalOperation(DataForLogin.NameUser, "")
	if errGoMongoDBCollUsers != nil {
		if errGoMongoDBCollUsers == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "User not found",
			})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Internal Server Error",
			})
		}
	}

	IsUserBlocked, err := h.userService.IsUserBlocked(DataForLogin.NameUser)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "login failed in block",
		})
	}
	if IsUserBlocked {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Too many failed login attempts. Please try again late",
		})
	}
	if err := helpers.DecodePassword(user.PasswordHash, DataForLogin.Password); err != nil {
		h.userService.HandleLoginFailure(DataForLogin.NameUser)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "login failed",
		})
	}
	valid, err := auth.TOTPAutheLogin(DataForLogin.Totpcode, user.TOTPSecret)
	if !valid || err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "invalid",
			"data":    err,
		})
	}
	token, err := jwt.CreateToken(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "CreateToken err",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "token",
		"data":     token,
		"_id":      user.ID,
		"avatar":   user.Avatar,
		"nameUser": user.NameUser,
	})
}

func (h *UserHandler) GoogleLogin(c *fiber.Ctx) error {
	randomstate := helpers.GenerateStateOauthCookie(c)

	googleConfig := configoauth2.LoadConfig()
	url := googleConfig.AuthCodeURL(randomstate)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "statusOk",
		"redirect": url,
	})
}

// login
func (h *UserHandler) Login(c *fiber.Ctx) error {
	var DataForLogin domain.LoginValidatorStruct
	if err := c.BodyParser(&DataForLogin); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
		})
	}
	if err := DataForLogin.LoginValidator(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	user, errGoMongoDBCollUsers := h.userService.FindNameUserInternalOperation(DataForLogin.NameUser, "")
	if errGoMongoDBCollUsers != nil {
		if errGoMongoDBCollUsers == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "User not found",
			})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "Internal Server Error",
			})
		}
	}

	IsUserBlocked, err := h.userService.IsUserBlocked(DataForLogin.NameUser)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "login failed",
		})
	}
	if IsUserBlocked {

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"message": "Too many failed login attempts. Please try again late",
		})
	}
	if err := helpers.DecodePassword(user.PasswordHash, DataForLogin.Password); err != nil {

		h.userService.HandleLoginFailure(DataForLogin.NameUser)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "login failed",
		})
	}
	if user.TOTPSecret != "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "TOTPSecret",
		})
	}
	token, err := jwt.CreateToken(user)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "CreateTokenError",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "token",
		"token":    token,
		"_id":      user.ID,
		"avatar":   user.Avatar,
		"nameUser": user.NameUser,
	})
}
func (h *UserHandler) SaveUserCodeConfirm(c *fiber.Ctx) error {
	var newUser userdomain.ReqCodeInRedisSignup
	if err := c.BodyParser(&newUser); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"messages": "Bad Request",
		})
	}
	if err := newUser.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	user, errGetUserinRedis := h.userService.GetUserinRedis(newUser.Code)
	if errGetUserinRedis != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"messages": "StatusNotFound",
			"data":     "not found code or not exist",
		})
	}
	streamID, err := h.userService.SaveUser(user)
	user.ID = streamID
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"messages": "StatusInternalServerError",
		})
	}

	tokenRequest, err := jwt.CreateToken(user)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "token error",
			"data":    err.Error(),
		})
	}

	metricsErr := h.userService.UserMetricts(user, newUser.Intentions, newUser.Referral)
	if metricsErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    metricsErr,
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "token",
		"token":    tokenRequest,
		"_id":      user.ID,
		"avatar":   user.Avatar,
		"nameUser": user.NameUser,
	})

}
func (h *UserHandler) SignupSaveUserRedis(c *fiber.Ctx) error {
	var newUser domain.UserModelValidator
	fileHeader, _ := c.FormFile("avatar")
	PostImageChanel := make(chan string)
	errChanel := make(chan error)
	go helpers.ProcessImage(fileHeader, PostImageChanel, errChanel)

	if err := c.BodyParser(&newUser); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"messages": "Bad Request",
			"error":    err.Error(),
		})
	}

	if err := newUser.ValidateUser(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}

	// password
	passwordHashChan := make(chan string)
	go helpers.HashPassword(newUser.Password, passwordHashChan)
	_, existUser := h.userService.FindNameUser(newUser.NameUser, newUser.Email)
	if existUser != nil {
		if existUser == mongo.ErrNoDocuments {
			passwordHash := <-passwordHashChan
			if passwordHash == "error" {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "Internal Server Error hash",
				})
			}
			for {
				select {
				case avatarUrl := <-PostImageChanel:
					userDomaion := h.userService.UserDomaionUpdata(&newUser, avatarUrl, passwordHash)
					code, err := h.userService.SaveUserRedis(userDomaion)

					if err != nil {

						return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
							"message": "Internal Server Error",
							"err":     err,
						})
					}
					// err = helpers.ResendConfirmMail(code, userDomaion.Email)
					// if err != nil {
					// 	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					// 		"message": "Internal Server Error",
					// 		"err":     err,
					// 	})
					// }
					return c.Status(fiber.StatusOK).JSON(fiber.Map{
						"message": "email to confirm",
						"code":    code,
					})
				case <-errChanel:
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
						"message": "avatarUrl error",
					})
				}

			}
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
		})
	} else {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "exist NameUser or Email",
		})
	}
}
func (h *UserHandler) GenerateTOTPKey(c *fiber.Ctx) error {
	IdUserToken := c.Context().UserValue("_id").(string)
	nameUser := c.Context().UserValue("nameUser").(string)

	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	secret, url, err := h.userService.GenerateTOTPKey(context.Background(), IdUserTokenP, nameUser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
		"secret":  secret,
		"url":     url,
	})
}
func (h *UserHandler) ValidateTOTPCode(c *fiber.Ctx) error {
	var req struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
		})
	}
	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	valid, err := h.userService.ValidateTOTPCode(context.Background(), IdUserTokenP, req.Code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}
	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
	})
}
func (h *UserHandler) GetUserByIdTheToken(c *fiber.Ctx) error {

	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
		})
	}
	user, err := h.userService.FindUserById(IdUserTokenP)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"data":    user,
	})
}
func (h *UserHandler) GetUserById(c *fiber.Ctx) error {

	userIdStr := c.Query("id", "")
	if userIdStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "User id is required in query",
		})
	}
	userID, err := primitive.ObjectIDFromHex(userIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}
	user, err := h.userService.FindUserById(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"data":    user,
	})
}
func (h *UserHandler) UpdateUserBiography(c *fiber.Ctx) error {
	IdUserToken := c.Context().UserValue("_id").(string)

	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
		})
	}
	var req domain.EditBiography
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
		})
	}

	err := h.userService.UpdateUserBiography(IdUserTokenP, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
	})
}
func (h *UserHandler) SavePushToken(c *fiber.Ctx) error {
	IdUserToken := c.Context().UserValue("_id").(string)

	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}

	pushToken := c.Query("pushToken", "")
	if pushToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "User id is required in query",
		})
	}
	err := h.userService.SavePushToken(IdUserTokenP, pushToken)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
	})
}
func (h *UserHandler) UserPremiumAmonth(c *fiber.Ctx) error {
	var req domain.RevenueCatWebhook
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
		})
	}
	userID, errinObjectID := primitive.ObjectIDFromHex(req.Event.AppUserID)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
			"data":    errinObjectID.Error(),
		})
	}
	fmt.Println(req.Event)
	switch req.Event.Type {
	case "RENEWAL", "INITIAL_PURCHASE":
		err := h.userService.UserPremiumAmonth(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		err = h.userService.UpdateRecommendedWorkerPremium(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "StatusOK",
	})
}
func (h *UserHandler) EditAvatar(c *fiber.Ctx) error {
	fileHeader, _ := c.FormFile("avatar")
	PostImageChanel := make(chan string)
	errChanel := make(chan error)

	go helpers.ProcessImage(fileHeader, PostImageChanel, errChanel)

	IdUserToken := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(IdUserToken)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
		})
	}
	for {
		select {
		case avatarUrl := <-PostImageChanel:
			errUpdateUserFollow := h.userService.EditAvatar(avatarUrl, IdUserTokenP)
			if errUpdateUserFollow != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"message": "StatusInternalServerError",
				})
			}
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"message": "StatusOK",
				"avatar":  avatarUrl,
			})
		case <-errChanel:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"message": "avatarUrl error",
			})
		}

	}

}
func (h *UserHandler) SaveLocationTags(c *fiber.Ctx) error {
	var req userdomain.ReqLocationTags
	if err := c.BodyParser(&req); err != nil {

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Solicitud inválida"})
	}
	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	id := c.Context().UserValue("_id").(string)
	IdUserTokenP, errinObjectID := primitive.ObjectIDFromHex(id)
	if errinObjectID != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "StatusInternalServerError",
		})
	}
	err := h.userService.SaveLocationTags(IdUserTokenP, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error al obtener trabajos", "error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "save location",
	})
}
func (h *UserHandler) GetFilteredUsers(c *fiber.Ctx) error {
	var req userdomain.ReqLocationTags
	if err := c.BodyParser(&req); err != nil {

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Solicitud inválida"})
	}
	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	users, err := h.userService.GetFilteredUsers(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Error al obtener trabajos", "error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "save location",
		"users":   users,
	})
}
