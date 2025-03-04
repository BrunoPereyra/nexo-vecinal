// context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextProps {
    token: string | null;
    isLoading: boolean;
    login: (token: string, id: string, avatar: string, nameUser: string) => Promise<void>;
    logout: () => Promise<void>;
    loadCurrentUser: () => Promise<{ id: string | null; Avatar: string | null; NameUser: string | null } | undefined>;
}

const AuthContext = createContext<AuthContextProps>({
    token: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    loadCurrentUser: async () => undefined,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
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


    return (
        <AuthContext.Provider value={{ token, isLoading, login, logout, loadCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
