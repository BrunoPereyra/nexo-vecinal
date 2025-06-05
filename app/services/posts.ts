import Constants from "expo-constants";

const API = "https://deploy.pinkker.tv/9000"

export interface Post {
    id: string;
    title: string;
    description: string;
    Images: string[];
    likeCount: number;
    dislikes: number;
    commentCount: number;
    userDetails: PostUserDetails;
    createdAt: string;
    userLiked: boolean
    // Agrega otras propiedades según necesites
}

export interface PostUserDetails {
    id: string;
    nameUser: string;
    avatar: string;
}

export interface Comment {
    id: string;
    userID: string;
    text: string;
    createdAt: string;
}

/**
 * Crea un nuevo post (con hasta 3 imágenes).
 * @param postData - Objeto con la información del post a crear.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const createPost = async (postData: any, token: string) => {
    try {
        const formData = new FormData();

        formData.append("title", postData.title);
        formData.append("description", postData.description);
        formData.append("tags", JSON.stringify(postData.tags));
        if (postData.images && postData.images.length > 0) {
            postData.images.forEach((uri: string, index: number) => {
                const extension = uri.split('.').pop() || "jpg";
                // Crear un objeto con las propiedades requeridas para la imagen
                const imageFile = {
                    uri,
                    name: `image_${index}.${extension}`,
                    type: "image/jpeg",
                };
                formData.append("images", imageFile as any);
            });
        }

        // No seteamos "Content-Type" manualmente; fetch lo hará automáticamente.
        const res = await fetch(`${API}/post/create`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            body: formData,
        });

        return await res.json();
    } catch (error) {
        console.error("Error in createPost:", error);
    }
};

/**
 * Agrega un like a un post.
* @param postId - ID del post.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const addLike = async (postId: string, token: string) => {
    const res = await fetch(`${API}/post/${postId}/like`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });
    return await res.json();

};

/**
 * Agrega un dislike a un post.
 * @param postId - ID del post.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const Dislike = async (postId: string, token: string) => {
    const res = await fetch(`${API}/post/${postId}/dislike`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });
    return await res.json();
};

/**
 * Agrega un comentario a un post.
 * @param postId - ID del post.
 * @param commentData - Objeto con el comentario (por ejemplo, { text: "Comentario" }).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const addComment = async (postId: string, commentData: { text: string }, token: string) => {
    try {
        const res = await fetch(`${API}/post/${postId}/comment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(commentData)
        });
        const json = await res.json();
        return json;
    } catch (error) {
        console.error("Error in addComment:", error);
    }
};

/**
 * Obtiene los últimos posts (con datos del creador).
 * @returns La respuesta de la API en formato JSON.
 */
export const getLatestPosts = async (token: string, page = 1, limit = 20) => {
    try {
        const url = new URL(`${API}/post/latest`);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        const res = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error in getLatestPosts:", error);
    }
};

/**
 * Obtiene un post por su ID.
 * @param postId - ID del post.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getPostByID = async (postId: string, token: string) => {
    try {
        const res = await fetch(`${API}/post/${postId}/getPostId`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error in getPostByID:", error);
    }
};// En services/posts.ts
export const getCommentsForPost = async (postId: string, token: string, page: number = 1, limit: number = 10) => {
    try {
        // Construir la URL con los parámetros de página y límite
        const url = new URL(`${API}/post/${postId}/comments`);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());

        // Hacer la solicitud GET con los parámetros de consulta
        const res = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        // Manejar la respuesta
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }

        const data = await res.json(); // Procesar la respuesta correctamente

        return data;
    } catch (error) {
        console.error("Error en getCommentsForPost:", error);
    }
};
