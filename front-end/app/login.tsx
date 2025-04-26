import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { loginNameUser } from '../services/authService';
import { savePushToken } from '../services/userService';
import colors from '@/style/colors';

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
      await login(data.token, data._id, data.avatar, data.nameUser);
      await savePushToken(data.token, pushToken ? pushToken : "");
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

      <TouchableOpacity style={styles.signupButton} onPress={handleLogin}>
        <Text style={styles.signupButtonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/signup')}>
        <Text style={styles.loginButtonText}>Ir a registro</Text>
      </TouchableOpacity>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // "#FFFFFF" (Fondo claro)
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: colors.textDark, // "#333333" (Texto oscuro para contraste)
    fontWeight: "bold",
  },
  input: {
    height: 40,
    backgroundColor: colors.cream, // "#F5F5F5" (Campo de entrada claro)
    borderColor: colors.gold, // "#BDBDBD" (Borde sutil)
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    color: colors.textDark, // "#333333" (Texto oscuro)
    borderRadius: 5,
  },
  buttonSpacing: {
    marginVertical: 10,
  },
  errorText: {
    color: colors.errorRed, // "#D32F2F" (Rojo para errores)
    textAlign: "center",
    marginBottom: 10,
  },






  signupButton: {
    backgroundColor: colors.gold,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: colors.textDark,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  signupButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "bold",
  },
  loginButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  loginButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "bold",
  },
});

