import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import CustomText from './components/CustomText'; // Importamos el componente

export default function App() {
    return (
        <AuthProvider>
            <View style={styles.container}>
                <CustomText>¡Hola, mundo!</CustomText>
                <Slot />
            </View>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Fondo global
        padding: 16,
    },
});
