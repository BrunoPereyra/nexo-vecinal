package postdomain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Post representa una publicación de un usuario.
type Post struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	Images      []string           `json:"Images" bson:"Images"` // Hasta 3 imágenes
	// Se almacenan los IDs de los usuarios que dieron like o dislike
	Likes     []primitive.ObjectID `json:"likes" bson:"likes"`
	Dislikes  []primitive.ObjectID `json:"dislikes" bson:"dislikes"`
	Comments  []Comment            `json:"comments" bson:"comments"`
	CreatedAt time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time            `json:"updatedAt" bson:"updatedAt"`
}

// Comment representa un comentario en un post.
type Comment struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"userId" bson:"userId"`
	Text      string             `json:"text" bson:"text"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
}

// CreatePostRequest se usa para crear un nuevo post.
type CreatePostRequest struct {
	Title       string   `json:"title" bson:"title" validate:"required,min=3,max=100"`
	Description string   `json:"description" bson:"description" validate:"required,min=5,max=1000"`
	Images      []string `json:"Images" bson:"Images" validate:"required,dive,url,max=3"` // Se valida que se envíen hasta 3 URLs válidas
}
type PostResponse struct {
	ID           primitive.ObjectID `json:"id" bson:"_id"`
	UserID       primitive.ObjectID `json:"userId" bson:"userId"`
	Title        string             `json:"title" bson:"title"`
	Description  string             `json:"description" bson:"description"`
	Images       []string           `json:"Images" bson:"Images"`
	LikeCount    int                `json:"likeCount"`
	DislikeCount int                `json:"dislikeCount"`
	CommentCount int                `json:"commentCount"`
	UserLiked    bool               `json:"userLiked"`
	UserDisliked bool               `json:"userDisliked"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
	// Datos del creador
	UserDetails User `json:"userDetails,omitempty"`
}
type User struct {
	ID       primitive.ObjectID `json:"id" bson:"_id"`
	NameUser string             `json:"nameUser" bson:"NameUser"`
	Avatar   string             `json:"avatar" bson:"Avatar"`
}
type CommentResponse struct {
	ID         primitive.ObjectID `json:"id"`
	UserID     primitive.ObjectID `json:"userId"`
	Text       string             `json:"text"`
	CreatedAt  time.Time          `json:"createdAt"`
	UserDetail User               `json:"userDetail"`
}
