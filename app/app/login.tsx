import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { loginNameUser, loginWithGoogle } from '../services/authService';
import { savePushToken } from '../services/userService';
import colors from '@/style/colors';

// Importaciones para Google Sign-In
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from "expo-auth-session";

// Asegúrate de que WebBrowser esté listo antes de cualquier uso
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [nameUser, setNameUser] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login, pushToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);


  const googleClientId = "386642666747-g8lf2q1q0uok13r7iuqelfquubau1d9g.apps.googleusercontent.com"; // VERIFICA ESTE ID

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    scopes: ["openid", "profile", "email"],
    redirectUri: makeRedirectUri({
      native: "com.nexovecinal.app:/login",
    }),
  });

  async function handleGoogleLogin(idToken: string) {
    try {
      setLoading(true); // 
      const resLoginGoogle = await loginWithGoogle(idToken);
      console.log("Login con Google exitoso:", resLoginGoogle);

      if (resLoginGoogle.message === "redirect to complete user") {
        // Redirigir a la pantalla de completar perfil
        router.push({
          pathname: "/CompleteProfileScreen",
          params: {
            email: resLoginGoogle.data,
            fullName: resLoginGoogle.fullName,
            avatar: resLoginGoogle.avatar
          }
        });
        return;
      }

      // Si recibimos 'token', entonces sí hacemos login
      if (resLoginGoogle.message === "token") {
        console.log("Login con Google exitoso:", resLoginGoogle);

        await login(
          resLoginGoogle.data,     // aquí data es tu JWT interno
          resLoginGoogle._id,
          resLoginGoogle.avatar,
          resLoginGoogle.nameUser
        );
        await savePushToken(resLoginGoogle.data, pushToken || "");
        router.replace("/(protected)/profile/Profile");
        return;
      }

      // Cualquier otro caso, mostramos error
      throw new Error("Respuesta inesperada del backend");
    } catch (err: any) {
      console.error("Fallo login backend con Google", err);
      setErrorMessage(err.message || "Error al iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (response?.type === "success") {
      const { id_token: idToken } = response.params;

      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        console.error("No se recibió el id_token de Google");
        setErrorMessage("Error al iniciar sesión con Google.");
      }
    } else if (response?.type === "error") {
      console.error("Error en la respuesta de Google:", response.params);
      setErrorMessage("Error al iniciar sesión con Google.");
    }
  }, [response]);


  const handleLogin = async () => {
    try {
      setErrorMessage(''); // Limpiar el mensaje de error antes de intentar iniciar sesión

      const data = await loginNameUser(nameUser, password);

      await login(data.token, data._id, data.avatar, data.nameUser);
      await savePushToken(data.token, pushToken ? pushToken : "");
      router.replace("/profile/Profile");
    } catch (error) {
      // Mejorar el manejo de errores:
      // Si el error viene de tu backend y tiene un mensaje específico, úsalo.
      if (error) {
        setErrorMessage('Error al iniciar sesión. Verifica tus credenciales.');
      }

      console.error("Error al iniciar sesión con usuario/contraseña:", error);
    }
  };
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ marginTop: 15, color: colors.textDark }}>Iniciando sesión con Google...</Text>
      </View>
    );
  }
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

      {/* Botón de Google Sign-In */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => promptAsync()}
        disabled={!request} // Deshabilita el botón si la request de Google no está lista
      >
        <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => promptAsync()}
        disabled={!request} // Deshabilita el botón si la request de Google no está lista
      >
        <Text style={styles.googleButtonText}>Registro con Google</Text>
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
  // --- Estilos para el botón de Google ---
  googleButton: {
    backgroundColor: '#DB4437', // Color de Google Rojo
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  googleButtonText: {
    color: '#FFFFFF', // Texto blanco
    fontSize: 18,
    fontWeight: 'bold',
  },
});