import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';

export const useGoogleAuth = () => {
    const { login } = useAuth();
    const router = useRouter();

    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: 'YOUR_IOS_CLIENT_ID',
        androidClientId: 'YOUR_ANDROID_CLIENT_ID',
        webClientId: 'YOUR_WEB_CLIENT_ID',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                login(authentication.accessToken);
                router.replace('(protected)/view1' as any);
            }
        }
    }, [response]);

    return { request, promptAsync };
};
