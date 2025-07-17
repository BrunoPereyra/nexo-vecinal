import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { loginNameUser, loginWithGoogle } from '../services/authService';
import { savePushToken } from '../services/userService';
import colors from '@/style/colors';

// Importaciones para Google Sign-In
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para guardar el token de acceso de Google
import { makeRedirectUri } from "expo-auth-session";

// Asegúrate de que WebBrowser esté listo antes de cualquier uso
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [nameUser, setNameUser] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login, pushToken } = useAuth();
  const router = useRouter();

  // ***** IMPORTANTE: Aquí debes usar el ID de Cliente de Google de tipo "Android" *****
  // Obtenlo de Google Cloud Console > APIs y Servicios > Credenciales
  // Asegúrate de que este ID de cliente esté configurado con:
  //   - "Nombre del paquete": "com.nexovecinal.app" (o el que sea tu package en app.json)
  //   - "Huella digital del certificado de firma SHA-1": La que obtuviste de 'gradlew signingReport'
  const googleClientId = "386642666747-g8lf2q1q0uok13r7iuqelfquubau1d9g.apps.googleusercontent.com"; // VERIFICA ESTE ID

  // --- CONFIGURACIÓN DE GOOGLE AUTH ---
  // Para tu flujo con 'com.nexovecinal.app:/oauthredirect', el 'androidClientId' es el más relevante.
  // El 'webClientId' se usa para aplicaciones web o para Expo Go cuando no hay un 'scheme' nativo configurado.
  // En tu caso actual, con el redirect URI 'com.nexovecinal.app:/oauthredirect', Google espera un CLIENT ID DE ANDROID.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleClientId, // <--- Este debe ser tu ID de Cliente de TIPO ANDROID de Google Cloud Console
    iosClientId: googleClientId,     // <--- Si planeas iOS, necesitarás un ID de Cliente de TIPO IOS diferente aquí
    // webClientId: 'TU_ID_DE_CLIENTE_WEB_DE_GOOGLE.apps.googleusercontent.com', // Puedes comentarlo o quitarlo si no lo necesitas para web
    scopes: ['profile', 'email'], // Permisos que solicitas
    redirectUri: makeRedirectUri({
      scheme: "com.nexovecinal.app",
    }),
  });

  // Logs para depuración (déjalos mientras depuras)
  console.log("Request de Google Auth:", request);
  console.log("Response de Google Auth:", response);

  // Efecto para manejar la respuesta de Google
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        // *** AQUÍ IMPRIMIMOS EL TOKEN DE ACCESO DE GOOGLE ***
        console.log("¡Éxito en Google Auth! Access Token:", authentication.accessToken);
        Alert.alert("Google Auth Exitoso", `Token: ${authentication.accessToken.substring(0, 30)}...`); // Muestra un Alert simple

        // Ahora, envía este token a tu backend para verificarlo y obtener el token de tu propia API
        handleGoogleLoginBackend(authentication.accessToken);

        // Opcional: Guardar el token de acceso de Google si lo necesitas para futuras llamadas a APIs de Google
        // AsyncStorage.setItem('googleAccessToken', authentication.accessToken);
      } else {
        setErrorMessage('No se pudo obtener el token de acceso de Google.');
        console.error("Google Auth Error: No accessToken en la respuesta de éxito.");
      }
    } else if (response?.type === 'error') {
      setErrorMessage(`Error de autenticación con Google: ${response.error?.message || 'Desconocido'}`);
      console.error("Google Auth Error:", response.error);
    } else if (response?.type === 'cancel') { // Manejar explícitamente el 'cancel'
      setErrorMessage('Autenticación con Google cancelada por el usuario.');
      console.log("Google Auth: Usuario canceló el flujo.");
    } else if (response?.type === 'dismiss') { // Manejar explícitamente el 'dismiss'
      setErrorMessage('Ventana de autenticación de Google cerrada inesperadamente.');
      console.log("Google Auth: Ventana descartada por el usuario o sistema.");
    }
  }, [response]);

  // Función para enviar el token de Google a tu backend
  const handleGoogleLoginBackend = async (googleAccessToken: string) => {
    try {
      // **IMPORTANTE**: Esta es una función hipotética que tú deberías implementar en 'authService.js'
      // Tu backend DEBE:
      // 1. Recibir el googleAccessToken.
      // 2. Usar ese token para verificar la identidad del usuario con Google (ej. Google OAuth2 API).
      // 3. Si el usuario existe en tu base de datos (por su email de Google), iniciar sesión.
      // 4. Si no existe, crear una nueva cuenta para ese usuario (o asociar su cuenta de Google a una existente).
      // 5. Devolver tu propio token de autenticación y los datos del usuario (data._id, data.avatar, data.nameUser).

      // *** SIMULACIÓN DEL BACKEND PARA PROBAR EL FLUJO ***
      // Esto es solo para que puedas ver que el flujo llega hasta aquí.
      // EN PRODUCCIÓN, DEBES LLAMAR A TU FUNCIÓN loginWithGoogle REAL.
      console.log("Simulando llamada al backend con Google Access Token:", googleAccessToken);
      // const data = await loginWithGoogle(googleAccessToken); // <--- DESCOMENTA Y USA ESTO CUANDO TENGAS TU BACKEND

      // --- Datos de ejemplo para simular la respuesta de tu backend ---
      const simulatedBackendData = {
        token: "tu_token_de_autenticacion_backend_simulado_12345",
        _id: "id_usuario_simulado_google",
        avatar: "https://via.placeholder.com/150",
        nameUser: "Usuario Google Simulado"
      };
      const data = simulatedBackendData; // Usamos datos simulados por ahora


      await login(data.token, data._id, data.avatar, data.nameUser);
      await savePushToken(data.token, pushToken ? pushToken : "");
      router.replace("/profile/Profile");

    } catch (error) {
      console.error("Error al autenticar Google en el backend:", error);
      setErrorMessage('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
      // Opcional: Mostrar un error más específico si el backend lo proporciona
      // setErrorMessage(error.message || 'Error al iniciar sesión con Google.');
    }
  };

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