import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:90000";

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

