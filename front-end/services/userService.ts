import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

const API = process.env.EXPO_URL_API ?? "http://192.168.0.22:8084"
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
        alert('Ocurrió un error');
    }
};
