import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:9000";

// Función para hacer un GET que envía un token en el header Authorization
export const getUserToken = async (token: string) => {
    try {
        const res = await fetch(`${API}/user/get-user-token`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        // Se asume que la respuesta es JSON
        return await res.json();
    } catch (error) {
        console.error(error);
    }
};
export const savePushToken = async (token: string, pushToken: string) => {
    try {
        const res = await fetch(`${API}/user/save-push-token?pushToken=${encodeURIComponent(pushToken)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        return await res.json();
    } catch (error) {
        console.error("Error saving push token:", error);
        throw error;
    }
};
export const getUserByid = async (id: string) => {
    try {
        const res = await fetch(`${API}/user/get-user-by-id?id=${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Se asume que la respuesta es JSON
        return await res.json();
    } catch (error) {
        console.error(error);
    }
};
export const Editbiografia = async (Biography: string, token: string) => {
    try {

        const res = await fetch(`${API}/user/edit-biografia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ Biography })
        });
        return await res.json();
    } catch (error) {

        console.error("Error en createJob:", error);
    }
}; export const EditAvatar = async (avatarUri: string, token: string) => {
    const formData = new FormData();
    // Extrae el nombre del archivo de la URI
    const fileName = avatarUri.split('/').pop() || "avatar.jpg";
    // Obtén la extensión del archivo
    const match = /\.(\w+)$/.exec(fileName);
    const fileExt = match ? match[1].toLowerCase() : "jpg";
    // Define el tipo MIME basado en la extensión (ajusta según tus necesidades)
    let mimeType = `image/${fileExt}`;
    if (fileExt === "jpg") {
        mimeType = "image/jpeg";
    }

    formData.append("avatar", {
        uri: avatarUri,
        name: fileName,
        type: mimeType,
    } as any);

    try {
        const res = await fetch(`${API}/user/EditAvatar`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                // No agregues 'Content-Type' porque el FormData lo gestiona automáticamente
            },
            body: formData,
        });
        return await res.json();
    } catch (error) {
        console.error("Error al editar avatar:", error);
    }
};

export interface GeoPoint {
    type: string; // Siempre "Point"
    coordinates: number[]; // [longitud, latitud]
}

export interface ReqLocationTags {
    location: GeoPoint;
    ratio: number;
    tags: string[];
}

/**
 * Guarda la ubicación, ratio y tags del usuario.
 * @param locationTags - Objeto con la información (location, ratio y tags).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const saveLocationTags = async (locationTags: ReqLocationTags, token: string) => {
    try {
        const res = await fetch(`${API}/user/save-location-tags`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(locationTags)
        });
        return await res.json();
    } catch (error) {
        console.error("Error in saveLocationTags:", error);
    }
};

/**
 * Obtiene los usuarios filtrados por ubicación, ratio, tags y que tengan Prime activo.
 * @param locationTags - Objeto con la información (location, ratio y tags) para filtrar.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getFilteredUsers = async (locationTags: ReqLocationTags, token: string) => {
    try {
        const res = await fetch(`${API}/user/get-users-premium-ratiosTags`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(locationTags)
        });
        return await res.json();
    } catch (error) {
        console.error("Error in getFilteredUsers:", error);
    }
}
export const subscribeUser = async (token: string) => {
    try {
        const res = await fetch(`${API}/user/subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({}), // Si no se necesita más información, se envía un objeto vacío.
        });
        return await res.json();
    } catch (error) {
        console.error("Error in subscribeUser:", error);
        throw error;
    }
};
export const sendPurchaseToBackend = async (purchase: any, token: string) => {
    try {
        const res = await fetch(`${API}/user/premium`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                orderId: purchase.orderId,
                productId: purchase.productId,
                purchaseToken: purchase.purchaseToken,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Error de validación:", errorData);
            return { success: false, message: errorData.message || "Error de validación" };
        }

        return await res.json();
    } catch (error) {
        console.error("Error en sendPurchaseToBackend:", error);
        return { success: false, message: "Error de red o del servidor" };
    }
};

export const getRecommendedWorkers = async (
    token: string,
    page: number,
    geoPoint: GeoPoint,
    maxDistance: number,
    categories?: string[]
) => {
    try {
        const body = {
            page,
            limit: 10,
            categories: categories || [],
            geoPoint,
            maxDistance,
        };

        const res = await fetch(`${API}/workers/recommended`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        console.log("Response from getRecommendedWorkers:", res.json());

        return await res.json();
    } catch (error) {
        console.error("Error in getRecommendedWorkers:", error);
        return null;
    }
};
