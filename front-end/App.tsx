// app.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Button, Platform, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    } else {
        alert('Debe usar un dispositivo físico para recibir notificaciones push.');
    }
}