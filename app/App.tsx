// app.tsx
import React, { useEffect, useRef } from 'react';
import { View, Button, Platform, StatusBar, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';
// Componente de texto global con Poppins
import { Text as RNText, TextProps } from 'react-native';
function AppText(props: TextProps) {
    return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />;
}

// Configuramos el handler para notificaciones en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});


export default function App() {
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    // Carga la fuente Poppins
    let [fontsLoaded] = useFonts({ Poppins_400Regular });

    useEffect(() => {
        registerForNotificationsAsync();

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notificación recibida:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Interacción con la notificación:', response);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    const sendLocalNotification = async () => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Notificación de prueba',
                body: '¡Hola! Esto es una notificación local',
            },
            trigger: null, // null = se envía inmediatamente
        });
    };

    // Espera a que la fuente esté cargada
    if (!fontsLoaded) return null;

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <StatusBar backgroundColor="#0f2027" barStyle="light-content" />
            <Text>Prueba de Notificaciones Locales</Text>
            <Button
                title="Enviar notificación local"
                onPress={sendLocalNotification}
            />
        </View>
    );
}

async function registerForNotificationsAsync() {
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('No se han otorgado permisos para recibir notificaciones.');
            return;
        }


    } else {
        alert('Debe usar un dispositivo físico para recibir notificaciones push.');
    }
}