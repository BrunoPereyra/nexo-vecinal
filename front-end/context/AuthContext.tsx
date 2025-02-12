// context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextProps {
    token: string | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
    token: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // Cargar el token almacenado
    const loadToken = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            console.log(storedToken);
            console.log("storedToken");

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

    const login = async (newToken: string) => {
        try {
            await AsyncStorage.setItem('token', newToken);
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

    return (
        <AuthContext.Provider value={{ token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
