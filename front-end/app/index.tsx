// app/index.tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            router.replace('/(protected)/home');
        }, 0);
        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
        </View>
    );
}
