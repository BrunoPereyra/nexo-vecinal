package postinfrastructure

import (
	"back-end/internal/posts/postdomain"
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PostRepository struct {
	redisClient *redis.Client
	mongoClient *mongo.Client
}

func NewPostRepository(redisClient *redis.Client, mongoClient *mongo.Client) *PostRepository {
	return &PostRepository{
		redisClient: redisClient,
		mongoClient: mongoClient,
	}
}

func (pr *PostRepository) getCollection() *mongo.Collection {
	return pr.mongoClient.Database("NEXO-VECINAL").Collection("Posts")
}

func (pr *PostRepository) CreatePost(post postdomain.Post) (primitive.ObjectID, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := collection.InsertOne(ctx, post)
	if err != nil {
		return primitive.NilObjectID, err
	}
	insertedID, ok := result.InsertedID.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, errors.New("failed to convert insertedID to ObjectID")
	}
	return insertedID, nil
}
func (pr *PostRepository) GetPostByID(postID primitive.ObjectID, currentUserID primitive.ObjectID) (*postdomain.PostResponse, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		// Filtrar por ID del post
		{{Key: "$match", Value: bson.D{{Key: "_id", Value: postID}}}},
		// Lookup para traer los detalles del usuario creador
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Users"},
			{Key: "localField", Value: "userId"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "userDetailsArr"},
		}}},
		// Agregar campos computados
		{{Key: "$addFields", Value: bson.D{
			{Key: "userDetails", Value: bson.D{{Key: "$first", Value: "$userDetailsArr"}}},
			{Key: "likeCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$likes", bson.A{}}}}}}},
			{Key: "dislikeCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$dislikes", bson.A{}}}}}}},
			{Key: "commentCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$comments", bson.A{}}}}}}},
			{Key: "userLiked", Value: bson.D{{Key: "$in", Value: bson.A{currentUserID, "$likes"}}}},
			{Key: "userDisliked", Value: bson.D{{Key: "$in", Value: bson.A{currentUserID, "$dislikes"}}}},
		}}},
		// Proyectar únicamente los campos necesarios
		{{Key: "$project", Value: bson.D{
			{Key: "likes", Value: 0},
			{Key: "dislikes", Value: 0},
			{Key: "comments", Value: 0},
			{Key: "userDetailsArr", Value: 0},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []postdomain.PostResponse
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	if len(posts) == 0 {
		return nil, errors.New("post not found")
	}

	return &posts[0], nil
}

func (pr *PostRepository) AddLike(postID, userID primitive.ObjectID) error {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"$addToSet": bson.M{"likes": userID},    // agrega solo si no existe
		"$pull":     bson.M{"dislikes": userID}, // remueve dislike si existe
		"$set":      bson.M{"updatedAt": time.Now()},
	}
	_, err := collection.UpdateByID(ctx, postID, update)
	return err
}

func (pr *PostRepository) AddDislike(postID, userID primitive.ObjectID) error {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"$addToSet": bson.M{"dislikes": userID},
		"$pull":     bson.M{"likes": userID},
		"$set":      bson.M{"updatedAt": time.Now()},
	}
	_, err := collection.UpdateByID(ctx, postID, update)
	return err
}

func (pr *PostRepository) AddCommentToPost(postID primitive.ObjectID, comment postdomain.Comment) (primitive.ObjectID, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Asegurarse de que el comentario tenga un ID
	if comment.ID.IsZero() {
		comment.ID = primitive.NewObjectID()
	}

	update := bson.M{
		"$push": bson.M{"comments": comment},
		"$set":  bson.M{"updatedAt": time.Now()},
	}
	result, err := collection.UpdateByID(ctx, postID, update)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if result.ModifiedCount == 0 {
		return primitive.NilObjectID, errors.New("no se pudo actualizar el post")
	}
	return comment.ID, nil
}

func (pr *PostRepository) GetLatestPosts(limit int) ([]postdomain.Post, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(int64(limit))
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	var posts []postdomain.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}
func (pr *PostRepository) GetLatestPostsDetailed(currentUserID primitive.ObjectID, limit int) ([]postdomain.PostResponse, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		// Ordenar por CreatedAt descendente y limitar
		{{Key: "$sort", Value: bson.D{{Key: "createdAt", Value: -1}}}},
		{{Key: "$limit", Value: limit}},
		// Lookup para traer los detalles del usuario creador
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "Users"},
			{Key: "localField", Value: "userId"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "userDetailsArr"},
		}}},
		// Agregar campos computados
		{{Key: "$addFields", Value: bson.D{
			// Aseguramos que userDetails sea un objeto, no un array
			{Key: "userDetails", Value: bson.D{{Key: "$first", Value: "$userDetailsArr"}}},
			{Key: "likeCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$likes", bson.A{}}}}}}},
			{Key: "dislikeCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$dislikes", bson.A{}}}}}}},
			{Key: "commentCount", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$comments", bson.A{}}}}}}},
			{Key: "userLiked", Value: bson.D{{Key: "$in", Value: bson.A{currentUserID, "$likes"}}}},
			{Key: "userDisliked", Value: bson.D{{Key: "$in", Value: bson.A{currentUserID, "$dislikes"}}}},
		}}},
		// Proyectar únicamente los campos necesarios
		{{Key: "$project", Value: bson.D{
			{Key: "likes", Value: 0},
			{Key: "dislikes", Value: 0},
			{Key: "comments", Value: 0},
			{Key: "userDetailsArr", Value: 0}, // Eliminamos el array original
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []postdomain.PostResponse
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func (pr *PostRepository) GetCommentsForPost(postID primitive.ObjectID, page, limit int) ([]postdomain.CommentResponse, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	skip := (page - 1) * limit

	pipeline := mongo.Pipeline{
		// Filtro: seleccionar el post por ID
		{{Key: "$match", Value: bson.M{"_id": postID}}},
		// Desempaquetar el array de comentarios
		{{Key: "$unwind", Value: "$comments"}},
		// Ordenar los comentarios por fecha
		{{Key: "$sort", Value: bson.M{"comments.createdAt": -1}}},
		// Aplicar paginación
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
		// ✅ FIX: Convertir userID si es string
		{{Key: "$addFields", Value: bson.M{
			"comments.userID": bson.M{"$toObjectId": "$comments.userID"},
		}}},
		// Hacer `$lookup` con la colección Users
		{{Key: "$lookup", Value: bson.M{
			"from":         "Users",
			"localField":   "comments.userID",
			"foreignField": "_id",
			"as":           "userDetail",
		}}},
		// Asegurar que userDetail no sea un array
		{{Key: "$unwind", Value: bson.M{"path": "$userDetail", "preserveNullAndEmptyArrays": true}}},
		// Seleccionar los campos deseados
		{{Key: "$project", Value: bson.M{
			"id":        "$comments._id",
			"text":      "$comments.text",
			"userId":    "$comments.userID",
			"createdAt": "$comments.createdAt",
			"userDetail": bson.M{
				"id":       "$userDetail._id",
				"nameUser": "$userDetail.NameUser",
				"avatar":   "$userDetail.Avatar",
			},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []postdomain.CommentResponse
	if err = cursor.All(ctx, &comments); err != nil {
		return nil, err
	}

	return comments, nil
}

func (pr *PostRepository) GetCommentByID(commentID primitive.ObjectID) (postdomain.CommentResponse, error) {
	collection := pr.getCollection()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		// 1. Desempaquetar el array de comentarios
		{{Key: "$unwind", Value: "$comments"}},
		// 2. Filtrar el comentario que tenga _id igual a commentID
		{{Key: "$match", Value: bson.M{"comments._id": commentID}}},
		// 3. Lookup para traer el detalle del usuario que creó el comentario
		{{Key: "$lookup", Value: bson.M{
			"from":         "Users",
			"localField":   "comments.userID", // Corregido
			"foreignField": "_id",
			"as":           "userDetail",
		}}},
		// 4. Desempaquetar el array resultante de userDetail (se espera un solo usuario)
		{{Key: "$unwind", Value: bson.M{"path": "$userDetail", "preserveNullAndEmptyArrays": true}}},
		// 5. Proyectar los campos necesarios en la respuesta
		{{Key: "$project", Value: bson.M{
			"id":        "$comments._id",
			"text":      "$comments.text",
			"userId":    "$comments.userId",
			"createdAt": "$comments.createdAt",
			"userDetail": bson.M{
				"id":       "$userDetail._id",
				"username": "$userDetail.NameUser",
				"avatar":   "$userDetail.Avatar",
			},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return postdomain.CommentResponse{}, err
	}
	defer cursor.Close(ctx)

	var comments []postdomain.CommentResponse
	if err = cursor.All(ctx, &comments); err != nil {
		return postdomain.CommentResponse{}, err
	}

	if len(comments) == 0 {
		return postdomain.CommentResponse{}, errors.New("comment not found")
	}

	return comments[0], nil
}
