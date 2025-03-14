import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getTags as apiGetTags, addTag as apiAddTag } from '@/services/admin';

interface AuthContextProps {
    token: string | null;
    pushToken: string | null;
    isLoading: boolean;
    login: (token: string, id: string, avatar: string, nameUser: string) => Promise<void>;
    logout: () => Promise<void>;
    loadCurrentUser: () => Promise<{ id: string | null; Avatar: string | null; NameUser: string | null } | undefined>;
    tags: string[];
    addTag: (tag: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
    token: null,
    pushToken: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    loadCurrentUser: async () => undefined,
    tags: [],
    addTag: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    // Inicialmente vacio; se cargará desde la API si existe token.
    const [tags, setTags] = useState<string[]>([]);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Función para registrar notificaciones y obtener el token push

    const registerForPushNotificationsAsync = async () => {
        if (!Device.isDevice) {
            Alert.alert('Advertencia', 'Debe usar un dispositivo físico para recibir notificaciones push.');
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            Alert.alert('Permiso denegado', 'No se han otorgado permisos para recibir notificaciones.');
            return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        setPushToken(tokenData.data);
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    };
    // Cargar el token almacenado
    const loadToken = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            if (storedToken) {
                setToken(storedToken);
            }
        } catch (error) {
            console.error('Error loading token', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar los tags desde la API (si existe token) o usar un valor por defecto.
    useEffect(() => {
        async function loadTags() {
            if (token) {
                try {
                    const response = await apiGetTags(token);
                    if (response && Array.isArray(response)) {
                        setTags(response);
                    } else {
                        setTags([]); // O dejar un valor por defecto
                    }
                } catch (error) {
                    console.error('Error loading tags from API:', error);
                    // Si falla, puedes optar por un valor por defecto.
                    setTags(['Plomería', 'Electricidad', 'Construcción', 'Pintura', 'Carpintería', 'Limpieza']);
                }
            }
        }
        loadTags();
    }, [token]);

    const login = async (newToken: string, id: string, avatar: string, nameUser: string) => {
        try {
            await AsyncStorage.setItem('token', newToken);
            await AsyncStorage.setItem('id', id);
            await AsyncStorage.setItem('avatar', avatar);
            await AsyncStorage.setItem('nameUser', nameUser);
            setToken(newToken);
        } catch (error) {
            console.error('Error saving token:', error);
        }
    };

    const logout = async () => {
        try {
            setToken(null);
            await AsyncStorage.removeItem('token');
        } catch (error) {
            console.error('Error removing token', error);
        }
    };

    const loadCurrentUser = async (): Promise<{ id: string | null; Avatar: string | null; NameUser: string | null } | undefined> => {
        try {
            const id = await AsyncStorage.getItem('id');
            const Avatar = await AsyncStorage.getItem('avatar');
            const NameUser = await AsyncStorage.getItem('nameUser');
            return { id, Avatar, NameUser };
        } catch (err) {
            console.error('Error al cargar info del usuario:', err);
        }
    };

    // Función para agregar una nueva etiqueta usando el servicio.
    const addTag = async (tag: string) => {
        if (tag && !tags.includes(tag)) {
            try {
                // Llamar al servicio para agregar el tag.
                await apiAddTag(tag, token!);
                setTags([...tags, tag]);
            } catch (error) {
                console.error('Error adding tag:', error);
            }
        }
    };

    useEffect(() => {
        registerForPushNotificationsAsync();
        loadToken();
    }, []);

    return (
        <AuthContext.Provider value={{ token, pushToken, isLoading, login, logout, loadCurrentUser, tags, addTag }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
