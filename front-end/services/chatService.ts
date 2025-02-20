const API = process.env.EXPO_URL_API ?? "http://192.168.0.28:8084"

// Envía un mensaje de chat. Se espera un objeto con senderId, receiverId, text y opcionalmente jobId.
export const sendChatMessage = async (
    message: {
        senderId: string;
        receiverId: string;
        text: string;
        jobId?: string;
    },
    token: string
) => {
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

// Obtiene los mensajes entre dos usuarios. Se pasan los IDs de ambos usuarios.
// Si el token es necesario, lo envías en la cabecera.
export const getMessagesBetween = async (
    user1: string,
    user2: string,
    token?: string
) => {
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

// Marca un mensaje como leído. Se le pasa el ID del mensaje y el token.
export const markMessageAsRead = async (
    messageId: string,
    token: string
) => {
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
