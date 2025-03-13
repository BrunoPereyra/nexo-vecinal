import Constants from "expo-constants";
const API = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:90000";

// Interfaz que define la estructura de un mensaje de soporte.
export interface SupportMessage {
    id?: string; // ahora es opcional
    senderId: string;
    receiverId: string;
    text: string;
    code?: string;
}

// Envía un mensaje de soporte.
// Se espera un objeto de tipo SupportMessage y un token (string).
export const sendSupportMessage = async (
    message: SupportMessage,
    token: string,

): Promise<any> => {
    try {
        const res = await fetch(`${API}/support/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(message)
        });

        return await res.json();
    } catch (error) {
        console.error("Error sending support message:", error);
        throw error;
    }
};

// Obtiene los mensajes de soporte entre un usuario y un agente de soporte.
// Se pasan los IDs de usuario y soporte, además del token de autenticación.
export const getSupportMessages = async (
    user: string,
    support: string,
    token: string
): Promise<SupportMessage[]> => {
    try {
        const res = await fetch(`${API}/support/messages?user=${user}&support=${support}`, {
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
        console.error("Error getting support messages:", error);
        throw error;
    }
};

// Marca un mensaje de soporte como leído.
// Recibe el ID del mensaje y el token.
export const markSupportMessageAsRead = async (
    messageId: string,
    token: string
): Promise<any> => {
    try {
        const res = await fetch(`${API}/support/messages/${messageId}/read`, {
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
        console.error("Error marking support message as read:", error);
        throw error;
    }
};
// Nueva función: getSupportConversations
export const getSupportConversations = async (
    token: string
): Promise<any> => {
    try {
        const res = await fetch(`${API}/support/conversations`, {
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
        console.error("Error getting support conversations:", error);
        throw error;
    }
};
export const GetSupportAgent = async (
    token: string
): Promise<any> => {
    try {
        const res = await fetch(`${API}/support/GetSupportAgent`, {
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
        console.error("Error marking support message as read:", error);
        throw error;
    }
};

// Función para suscribirse a mensajes de soporte vía WebSocket.
// Recibe el ID del soporte y un callback onMessage para procesar cada mensaje recibido.
export const subscribeSupportMessages = (
    supportID: string,
    onMessage: (data: string) => void
): WebSocket => {
    // Convertir http a ws para la URL de conexión.
    const wsUrl = API.replace(/^http/, "ws") + `/support/subscribe/${supportID}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Conectado al WebSocket de soporte");
    };

    ws.onmessage = (event: MessageEvent) => {

        onMessage(event.data);
    };

    ws.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
        console.log("Conexión de WebSocket cerrada");
    };

    return ws;
};
