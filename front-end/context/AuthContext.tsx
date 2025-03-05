import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextProps {
    token: string | null;
    isLoading: boolean;
    login: (token: string, id: string, avatar: string, nameUser: string) => Promise<void>;
    logout: () => Promise<void>;
    loadCurrentUser: () => Promise<{ id: string | null; Avatar: string | null; NameUser: string | null } | undefined>;
    tags: string[];
    addTag: (tag: string) => void;
}

const AuthContext = createContext<AuthContextProps>({
    token: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    loadCurrentUser: async () => undefined,
    tags: ['Plomería', 'Electricidad', 'Construcción', 'Pintura', 'Carpintería', 'Limpieza'],
    addTag: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // Estado para las etiquetas, inicializado con algunas por defecto
    const [tags, setTags] = useState<string[]>([
        'Plomería',
        'Electricidad',
        'Construcción',
        'Pintura',
        'Carpintería',
        'Limpieza',
    ]);

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

    useEffect(() => {
        loadToken();
    }, []);

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

    // Cargar información del usuario actual desde AsyncStorage
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

    // Función para agregar una nueva etiqueta (si aún no existe)
    const addTag = (tag: string) => {
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
        }
    };

    return (
        <AuthContext.Provider value={{ token, isLoading, login, logout, loadCurrentUser, tags, addTag }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
