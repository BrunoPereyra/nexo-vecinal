import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:9000";

export interface Post {
    id: string;
    title: string;
    description: string;
    Images: string[];
    likeCount: number;
    dislikes: number;
    commentCount: Comment[];
    userDetails: PostUserDetails;
    createdAt: string;
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
        const res = await fetch(`${API}/post/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(postData)
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
    try {
        const res = await fetch(`${API}/post/${postId}/like`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        var data = await res.json()
        console.log(data);
        return await res.json();
    } catch (error) {
        console.error("Error in addLike:", error);
    }
};

/**
 * Agrega un dislike a un post.
 * @param postId - ID del post.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const addDislike = async (postId: string, token: string) => {
    try {
        const res = await fetch(`${API}/post/${postId}/dislike`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await res.json();
    } catch (error) {
        console.error("Error in addDislike:", error);
    }
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
        console.log(res.json());

        return await res.json();
    } catch (error) {
        console.error("Error in addComment:", error);
    }
};

/**
 * Obtiene los últimos posts (con datos del creador).
 * @returns La respuesta de la API en formato JSON.
 */
export const getLatestPosts = async (token: string) => {
    try {
        const res = await fetch(`${API}/post/latest`, {
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
export const getCommentsForPost = async (postId: string, token: string) => {
    try {
        const res = await fetch(`${API}/post/${postId}/comments`, {
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
        console.error("Error in getCommentsForPost:", error);
    }
};
