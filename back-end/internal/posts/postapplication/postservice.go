package postapplication

import (
	"back-end/internal/posts/postdomain"
	"back-end/internal/posts/postinfrastructure"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostService struct {
	PostRepository *postinfrastructure.PostRepository
}

func NewPostService(repo *postinfrastructure.PostRepository) *PostService {
	return &PostService{
		PostRepository: repo,
	}
}

// CreatePost crea un nuevo post a partir de la información del request y el ID del creador.
func (ps *PostService) CreatePost(req postdomain.CreatePostRequest, userID primitive.ObjectID) (primitive.ObjectID, error) {
	newPost := postdomain.Post{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Images:      req.Images,
		Likes:       []primitive.ObjectID{},
		Dislikes:    []primitive.ObjectID{},
		Comments:    []primitive.ObjectID{},
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	return ps.PostRepository.CreatePost(newPost)
}
func (ps *PostService) GetPostByID(postID, userID primitive.ObjectID) (*postdomain.PostResponse, error) {
	return ps.PostRepository.GetPostByID(postID, userID)
}

// AddLike agrega un like de un usuario al post. Si ya votó, no se permite duplicar.
func (ps *PostService) AddLike(postID, userID primitive.ObjectID) error {
	return ps.PostRepository.AddLike(postID, userID)
}

// AddDislike agrega un dislike del usuario al post.
func (ps *PostService) AddDislike(postID, userID primitive.ObjectID) error {
	return ps.PostRepository.AddDislike(postID, userID)
}

// AddComment agrega un comentario al post.
func (ps *PostService) AddComment(postID primitive.ObjectID, comment postdomain.Comment) (primitive.ObjectID, error) {
	comment.ID = primitive.NewObjectID()
	comment.CreatedAt = time.Now()
	return ps.PostRepository.AddCommentToPost(postID, comment)
}

// GetLatestPosts retorna los posts más recientes (limite configurable).
func (ps *PostService) GetLatestPosts(limit int) ([]postdomain.Post, error) {
	return ps.PostRepository.GetLatestPosts(limit)
}

func (ps *PostService) GetLatestPostsDetailed(currentUserID primitive.ObjectID, page, limit int) ([]postdomain.PostResponse, error) {
	return ps.PostRepository.GetLatestPostsDetailed(currentUserID, page, limit)
}

// postapplication/post_service.go
func (ps *PostService) GetCommentsForPost(postID primitive.ObjectID, page, limit int) ([]postdomain.CommentResponse, error) {
	return ps.PostRepository.GetCommentsForPost(postID, page, limit)
}
func (ps *PostService) GetCommentByID(postID primitive.ObjectID) (postdomain.CommentResponse, error) {
	return ps.PostRepository.GetCommentByID(postID)
}
