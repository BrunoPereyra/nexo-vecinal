import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

const API = process.env.EXPO_URL_API ?? "http://192.168.0.28:8084"
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
};