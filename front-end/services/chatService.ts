import Constants from "expo-constants";
const API = "http://192.168.0.28:9000";


export interface ChatRoom {
    id: string;
    participant1: string;
    participant2: string;
    blockedBy?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: string;
}

// Obtiene o crea el chat room entre dos usuarios.
export const getChatRoom = async (
    userId: string,
    partnerId: string,
    token: string
): Promise<ChatRoom | undefined> => {
    try {
        const res = await fetch(`${API}/chat/room?user=${userId}&partner=${partnerId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error obteniendo chat room:", error);
    }
};

// Envía un mensaje de chat.
export const sendChatMessage = async (
    message: { senderId: string; receiverId: string; text: string },
    token: string
): Promise<{ data: any } | undefined> => {
    try {
        const res = await fetch(`${API}/chat/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(message)
        });
        return await res.json();
    } catch (error) {
        console.error("Error sending chat message:", error);
    }
};

// Obtiene los mensajes entre dos usuarios (el backend utiliza internamente el ChatRoom).
export const getMessagesBetween = async (
    user1: string,
    user2: string,
    token: string
): Promise<Message[] | undefined> => {
    try {
        const res = await fetch(`${API}/chat/messages?user1=${user1}&user2=${user2}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { "Authorization": `Bearer ${token}` })
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error getting chat messages:", error);
    }
};

// Marca un mensaje como leído.
export const markMessageAsRead = async (
    messageId: string,
    token: string
): Promise<{ data: any } | undefined> => {
    try {
        const res = await fetch(`${API}/chat/messages/${messageId}/read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error marking message as read:", error);
    }
};
// Obtiene los chats del usuario autenticado, paginados de 10 en 10.
export const getChatRooms = async (
    token: string,
    limit: number = 10,
    page: number = 1
): Promise<ChatRoom[] | undefined> => {
    try {
        const res = await fetch(`${API}/chat/rooms?limit=${limit}&page=${page}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error obteniendo chat rooms:", error);
    }
};
