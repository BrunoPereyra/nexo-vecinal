import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { loginNameUser } from '../services/authService';
import { savePushToken } from '../services/userService'; // o donde lo ubiques
import { useGoogleAuth } from '../hooks/useGoogleAuth';

export default function LoginScreen() {
  const [nameUser, setNameUser] = useState('');
  const [password, setPassword] = useState('');
  const { login, pushToken } = useAuth();
  const router = useRouter();
  const { request, promptAsync, userInfo } = useGoogleAuth();

  const handleLogin = async () => {
    try {
      const data = await loginNameUser(nameUser, password);
      if (!pushToken) {
        alert("No se pudo obtener el token de notificaciones.");
        return;
      }
      // Inicia sesión y guarda pushToken
      await login(data.token, data._id, data.avatar, data.nameUser,);
      // Guarda el pushToken en el backend
      await savePushToken(data.token, pushToken);
      router.replace("/profile/Profile");
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error desconocido');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        placeholderTextColor="#888"
        value={nameUser}
        onChangeText={setNameUser}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} color="#03DAC5" />
      <View style={styles.buttonSpacing}>
        <Button title="Ir a Signup" onPress={() => router.push('/signup')} color="#03DAC5" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', color: '#E0E0E0' },
  input: { height: 40, backgroundColor: '#1E1E1E', borderColor: '#03DAC5', borderWidth: 1, marginBottom: 10, paddingHorizontal: 10, color: '#E0E0E0', borderRadius: 5 },
  buttonSpacing: { marginVertical: 10 },
});
