package postinterfaces

import (
	"back-end/internal/posts/postapplication"
	"back-end/internal/posts/postdomain"
	"back-end/pkg/helpers"
	"mime/multipart"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// PostHandler expone los endpoints HTTP para posts.
type PostHandler struct {
	PostService *postapplication.PostService
	MongoClient *mongo.Client // Se utiliza para consultas avanzadas (lookup)
}

func NewPostHandler(postService *postapplication.PostService, mongoClient *mongo.Client) *PostHandler {
	return &PostHandler{
		PostService: postService,
		MongoClient: mongoClient,
	}
}

func (ph *PostHandler) CreatePost(c *fiber.Ctx) error {
	// Parseamos los campos de texto del body (por ejemplo, title y description)
	var req postdomain.CreatePostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Bad Request",
			"error":   err.Error(),
		})
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "StatusBadRequest",
		})
	}

	// Inicialmente, aseguramos que Images sea un slice vacío
	req.Images = []string{}

	// Intentamos obtener el multipart form para procesar imágenes, si existen
	form, err := c.MultipartForm()
	if err == nil && form != nil {
		files := form.File["images"]
		if len(files) > 3 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"message": "You can upload a maximum of 3 images",
			})
		}

		// Si se enviaron imágenes, procesamos cada archivo
		if len(files) > 0 {
			imageURLs := make([]string, len(files))
			errCh := make(chan error, len(files))
			doneCh := make(chan int, len(files))

			for i, fileHeader := range files {
				go func(index int, fh *multipart.FileHeader) {
					var postImageCh = make(chan string)
					var procErrCh = make(chan error)
					// Procesa la imagen de forma asíncrona (función definida en helpers)
					go helpers.ProcessImage(fh, postImageCh, procErrCh)
					select {
					case imageUrl := <-postImageCh:
						imageURLs[index] = imageUrl
						doneCh <- index
					case procErr := <-procErrCh:
						errCh <- procErr
					}
				}(i, fileHeader)
			}

			processed := 0
			for processed < len(files) {
				select {
				case <-doneCh:
					processed++
				case procErr := <-errCh:
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
						"message": "Error processing images",
						"error":   procErr.Error(),
					})
				}
			}
			req.Images = imageURLs
		}
	}

	// Obtener el ID del usuario desde el token
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid user ID",
		})
	}

	postId, err := ph.PostService.CreatePost(req, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Could not create post",
			"error":   err.Error(),
		})
	}
	post, err := ph.PostService.GetPostByID(postId, userID)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Post created successfully",
		"post":    post,
	})
}

// AddLike agrega un like a un post.
func (ph *PostHandler) GetPostByID(c *fiber.Ctx) error {
	postIDStr := c.Params("postId")
	postID, err := primitive.ObjectIDFromHex(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid post ID"})
	}
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}
	Post, err := ph.PostService.GetPostByID(postID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
		"post":    Post,
	})
}

// AddLike agrega un like a un post.
func (ph *PostHandler) AddLike(c *fiber.Ctx) error {
	postIDStr := c.Params("postId")
	postID, err := primitive.ObjectIDFromHex(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid post ID"})
	}
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}
	if err := ph.PostService.AddLike(postID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Like added"})
}

// AddDislike agrega un dislike a un post.
func (ph *PostHandler) AddDislike(c *fiber.Ctx) error {
	postIDStr := c.Params("postId")
	postID, err := primitive.ObjectIDFromHex(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid post ID"})
	}
	idValue := c.Context().UserValue("_id").(string)
	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}
	if err := ph.PostService.AddDislike(postID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Dislike added"})
}

// AddComment agrega un comentario a un post.
func (ph *PostHandler) AddComment(c *fiber.Ctx) error {
	postIDStr := c.Params("postId")
	postID, err := primitive.ObjectIDFromHex(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid post ID"})
	}
	type commentRequest struct {
		Text string `json:"text"`
	}
	var req commentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Bad Request"})
	}
	idValue := c.Context().UserValue("_id").(string)

	userID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}
	comment := postdomain.Comment{
		UserID: userID,
		Text:   req.Text,
	}
	CommentId, err := ph.PostService.AddComment(postID, comment)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	commentRes, err := ph.PostService.GetCommentByID(CommentId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Comment added",
		"comment": commentRes,
	})
}

// GetLatestPosts obtiene los últimos posts con información computada y datos del usuario creador.
func (ph *PostHandler) GetLatestPosts(c *fiber.Ctx) error {
	limit := 20 // O bien, puedes obtenerlo de los query params
	idValue := c.Context().UserValue("_id").(string)
	currentUserID, err := primitive.ObjectIDFromHex(idValue)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid user ID"})
	}
	posts, err := ph.PostService.GetLatestPostsDetailed(currentUserID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(posts)
}

// postinterfaces/post_handler.go
func (ph *PostHandler) GetCommentsForPost(c *fiber.Ctx) error {
	// Obtener el ID del post de los parámetros de la URL
	postIDStr := c.Params("postId")
	postID, err := primitive.ObjectIDFromHex(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid post ID"})
	}

	// Obtener los parámetros de paginación, con valores por defecto si no están presentes
	page, err := strconv.Atoi(c.Query("page", "1")) // Por defecto página 1
	if err != nil || page < 1 {
		page = 1 // Valor por defecto si no se pasa o es inválido
	}

	limit, err := strconv.Atoi(c.Query("limit", "10")) // Por defecto 10 comentarios
	if err != nil || limit < 1 {
		limit = 10 // Valor por defecto si no se pasa o es inválido
	}

	// Obtener los comentarios del servicio
	comments, err := ph.PostService.GetCommentsForPost(postID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": err.Error()})
	}

	// Retornar la respuesta con los comentarios y el mensaje de éxito
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "ok",
		"comments": comments,
	})
}
