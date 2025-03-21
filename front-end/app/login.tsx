import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { loginNameUser } from '../services/authService';
import { savePushToken } from '../services/userService';

export default function LoginScreen() {
  const [nameUser, setNameUser] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Estado para manejar el error
  const { login, pushToken } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setErrorMessage(''); // Limpiar el mensaje de error antes de intentar iniciar sesión

      const data = await loginNameUser(nameUser, password);
      if (!pushToken) {
        setErrorMessage('No se pudo obtener el token de notificaciones.');
        return;
      }

      await login(data.token, data._id, data.avatar, data.nameUser);
      await savePushToken(data.token, pushToken);
      router.replace("/profile/Profile");
    } catch (error) {
      setErrorMessage('Error al iniciar sesión. Verifica tus credenciales.');
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
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Button title="Login" onPress={handleLogin} color="#03DAC5" />
      <View style={styles.buttonSpacing}>
        <Button title="Ir a Signup" onPress={() => router.push('/signup')} color="#03DAC5" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2027', // Fondo principal
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#E0E0E0',
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    backgroundColor: '#203a43', // Sección secundaria
    borderColor: '#2c5364', // Borde activo
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    color: '#E0E0E0',
    borderRadius: 5,
  },
  buttonSpacing: {
    marginVertical: 10,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 10,
  },
});
