import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';

interface UserInfo {
    name?: string;
    picture?: string;
    email?: string;
    // puedes agregar más campos si los necesitas
}
export function useGoogleAuth() {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    // Ajusta estos ID con los que tengas en tu proyecto de Google
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: '989717813515-u23c5fmv8u9ucp3rl7qiubp9a1ngdlno.apps.googleusercontent.com',
    });

    // Cuando tengamos la respuesta, si es success, pedimos el perfil de Google
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                fetchUserInfo(authentication.accessToken);
            }
        }
    }, [response]);

    // Función para obtener el perfil del usuario desde Google
    const fetchUserInfo = async (accessToken: string) => {
        try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await resp.json();
            // data suele incluir: id, email, name, picture, etc.
            setUserInfo({
                name: data.name,
                picture: data.picture,
                email: data.email,
            });
        } catch (error) {
            console.error('Error obteniendo user info de Google:', error);
        }
    };

    return { request, promptAsync, userInfo };
}
