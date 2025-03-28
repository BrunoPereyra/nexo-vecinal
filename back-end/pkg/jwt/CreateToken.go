package jwt

import (
	"back-end/config"
	userdomain "back-end/internal/user/user-domain"
	"time"

	"github.com/golang-jwt/jwt"
)

func CreateToken(user *userdomain.User) (string, error) {
	TOKENPASSWORD := config.TOKENPASSWORD()
	claims := jwt.MapClaims{
		"_id":      user.ID,
		"nameuser": user.NameUser,
		"partner":  user.Partner.Active,
		"exp":      time.Now().Add(time.Hour * 2400).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString([]byte(TOKENPASSWORD))
	return signedToken, err
}

func CreateTokenEmailConfirmation(user *userdomain.UserModelValidator) (string, error) {
	TOKENPASSWORD := config.TOKENPASSWORD()
	claims := jwt.MapClaims{
		"nameuser": user.NameUser,
		"exp":      time.Now().Add(time.Minute * 15).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString([]byte(TOKENPASSWORD))
	return signedToken, err
}
