// app.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Button, Platform, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// 1. Configuramos el handler para notificaciones en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,     // Mostrar alerta
        shouldPlaySound: false,    // Sin sonido
        shouldSetBadge: false,     // Sin cambiar el ícono de la app
    }),
});

export default function App() {
    // Refs para listeners
    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    useEffect(() => {
        // Al montar el componente, pedimos permisos y obtenemos el token (para push, si lo necesitaras)
        registerForNotificationsAsync();

        // Listener: se llama cuando llega una notificación y la app está en primer plano
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notificación recibida:', notification);
        });

        // Listener: se llama cuando el usuario toca la notificación
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Interacción con la notificación:', response);
        });

        // Importante: limpiar los listeners al desmontar
        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    // Función para disparar una notificación local inmediata
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

// 2. Registrar permisos y obtener token
async function registerForNotificationsAsync() {
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;


        // Si no está concedido, pedimos el permiso
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // Si aun así no se concedió, avisamos
        if (finalStatus !== 'granted') {
            alert('No se han otorgado permisos para recibir notificaciones.');
            return;
        }

        // (Opcional) Obtener token para notificaciones push
        // Esto te servirá luego si quieres usar el servicio de push de Expo
        const tokenData = await Notifications.getExpoPushTokenAsync();

        // Configuración específica para Android
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
