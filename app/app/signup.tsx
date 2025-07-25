import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { SaveUserCodeConfirm, SignupService } from '@/services/authService';
import colors from '@/style/colors';
import { savePushToken } from '@/services/userService';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const [nameUser, setNameUser] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Estado para la fecha de nacimiento: se inicia con la fecha actual
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [Gender, setGender] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Nuevo estados para intención y referencia
  // La intención internamente se maneja como "hire" o "work", pero se muestran en español
  const [intention, setIntention] = useState<'hire' | 'work'>('hire');
  const [referral, setReferral] = useState<'amigo' | 'instagram' | 'facebook'>('amigo');


  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
    clientId: 'TU_CLIENT_ID.apps.googleusercontent.com', // 👈🏼 CAMBIÁ ESTO
  });
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken);
      }
    }
  }, [googleResponse]);
  const handleGoogleLogin = async (accessToken: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();

      // Datos de usuario de Google
      const emailGoogle = userInfo.email;
      const fullNameGoogle = userInfo.name || '';
      const username = emailGoogle.split('@')[0]; // username por defecto
      const fakeBirthDate = '2000-01-01';
      const defaultGender = 'Masculino';

      const data = await SignupService(
        emailGoogle,
        'google-oauth', // contraseña dummy
        username,
        fullNameGoogle,
        fakeBirthDate,
        defaultGender
      );

      if (data?.token) {
        await login(data.token, data._id, data.avatar, data.nameUser);
        await savePushToken(data.token, pushToken ?? '');
        router.push('/(protected)/home');
      } else if (data?.message === 'existing_user') {
        // ya registrado, loguear
        await login(data.token, data._id, data.avatar, data.nameUser);
        await savePushToken(data.token, pushToken ?? '');
        router.push('/(protected)/home');
      } else {
        setErrorMessage(data?.message || 'No se pudo registrar con Google');
      }
    } catch (error) {
      console.error('Error en login Google:', error);
      setErrorMessage('Falló el registro con Google');
    }
  };


  const { login, pushToken } = useAuth();
  const router = useRouter();

  // Validación de nombre de usuario (debe tener entre 3 y 20 caracteres y solo ser alfanumérico)
  const validateNameUser = (name: string): boolean => {
    if (name.length < 3 || name.length > 20) return false;
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(name);
  };

  // Formatear la fecha para mostrarla en el botón (DD-MM-YYYY)
  const getDisplayBirthDate = (): string => {
    const dd = String(birthDate.getDate()).padStart(2, '0');
    const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
    const yyyy = birthDate.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Formatear la fecha para enviarla al backend (YYYY-MM-DD)
  const getFormattedBirthDate = (): string => {
    const dd = String(birthDate.getDate()).padStart(2, '0');
    const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
    const yyyy = birthDate.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // En Android se cierra automáticamente
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSignup = async () => {
    setErrorMessage('');

    if (!validateNameUser(nameUser)) {
      setErrorMessage(
        'El nombre de usuario debe tener entre 3 y 20 caracteres y ser alfanumérico'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      const formattedBirthDate = getFormattedBirthDate();
      const data = await SignupService(
        email,
        password,
        nameUser,
        fullName,
        formattedBirthDate,
        Gender
      );

      if (data) {
        if (data.message === "email to confirm") {
          // Se envían también la intención y la referencia
          await handleSaveUserCodeConfirm(data.code, referral, intention);
        } else {
          if (
            data.code === 409 ||
            data.message.toLowerCase().includes("409")
          ) {
            setErrorMessage("El nombre de usuario o el email ya existen");
          } else {
            setErrorMessage(data.message || "No se pudo crear el usuario.");
          }
        }
      } else {
        setErrorMessage('Error en el signup');
      }
    } catch (error: any) {
      console.error("Error en signup:", error);
      if (error?.response?.status === 409) {
        setErrorMessage("El nombre de usuario o el email ya existen");
      } else {
        setErrorMessage(error.message || "Ocurrió un error desconocido");
      }
    }
  };

  const handleSaveUserCodeConfirm = async (code: any, referral: string, Intentions: string) => {
    try {
      const resConfirm = await SaveUserCodeConfirm(code, referral, Intentions);
      await login(
        resConfirm.token,
        resConfirm._id,
        resConfirm.avatar,
        resConfirm.nameUser
      );

      await savePushToken(resConfirm.token, pushToken ? pushToken : "");
      router.push('/(protected)/home');
    } catch (error) {
      console.error(error);
      setErrorMessage('Error al confirmar el código');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.signupButtonText}>Registrarse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signupButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gold, marginTop: 10 }]}
            onPress={() => promptAsync()}
          >
            <Text style={[styles.signupButtonText, { color: colors.gold }]}>
              Registrarse con Google
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>Registro</Text>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            placeholderTextColor="#888"
            value={nameUser}
            onChangeText={setNameUser}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#888"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
          />
          {/* Campo Password con ícono integrado */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={colors.gold}
              />
            </TouchableOpacity>
          </View>
          {/* Campo Confirm Password con ícono integrado */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Confirmar Password"
              placeholderTextColor="#888"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={colors.gold}
              />
            </TouchableOpacity>
          </View>
          {/* Selector de fecha de nacimiento usando DateTimePicker */}
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>
              Fecha de nacimiento: {getDisplayBirthDate()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()} // No se pueden elegir fechas futuras
            />
          )}
          {/* Selección de género con check (iconos) */}
          <View style={styles.genderContainer}>
            <Text style={styles.label}>Género:</Text>
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={styles.genderOption}
                onPress={() => setGender('Masculino')}
              >
                <Ionicons
                  name={Gender === 'Masculino' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={Gender === 'Masculino' ? colors.gold : "#888"}
                />
                <Text style={styles.genderOptionText}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.genderOption}
                onPress={() => setGender('Femenino')}
              >
                <Ionicons
                  name={Gender === 'Femenino' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={Gender === 'Femenino' ? colors.gold : "#888"}
                />
                <Text style={styles.genderOptionText}>Femenino</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Nueva sección: Intención */}
          <View style={styles.intentionContainer}>
            <Text style={styles.label}>Intención:</Text>
            <View style={styles.intentionOptions}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setIntention('hire')}
              >
                <Ionicons
                  name={intention === 'hire' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={intention === 'hire' ? colors.gold : "#888"}
                />
                {/* Se muestra en español */}
                <Text style={styles.optionText}>Contratar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setIntention('work')}
              >
                <Ionicons
                  name={intention === 'work' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={intention === 'work' ? colors.gold : "#888"}
                />
                <Text style={styles.optionText}>Trabajar</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Nueva sección: Referencia */}
          <View style={styles.referralContainer}>
            <Text style={styles.label}>Referencia:</Text>
            <View style={styles.referralOptions}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setReferral('amigo')}
              >
                <Ionicons
                  name={referral === 'amigo' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={referral === 'amigo' ? colors.gold : "#888"}
                />
                <Text style={styles.optionText}>Amigo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setReferral('instagram')}
              >
                <Ionicons
                  name={referral === 'instagram' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={referral === 'instagram' ? colors.gold : "#888"}
                />
                <Text style={styles.optionText}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setReferral('facebook')}
              >
                <Ionicons
                  name={referral === 'facebook' ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={referral === 'facebook' ? colors.gold : "#888"}
                />
                <Text style={styles.optionText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.signupButtonText}>Registrarse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Ir a Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'flex-start',  // antes era 'center'
    paddingBottom: 40,
  },
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 30,
    textAlign: "center",
    color: colors.textDark,
    fontWeight: "bold",
  },
  errorText: {
    color: colors.errorRed,
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    height: 50,
    backgroundColor: colors.warmWhite,
    borderColor: colors.borderLight,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: colors.textDark,
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    position: "relative",
  },
  inputWithIcon: {
    flex: 1,
    paddingRight: 40,
  },
  iconContainer: {
    position: "absolute",
    right: 10,
  },
  datePickerButton: {
    height: 50,
    backgroundColor: colors.warmWhite,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  datePickerText: {
    color: colors.textDark,
    fontSize: 16,
  },
  genderContainer: {
    marginBottom: 20,
  },
  label: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  genderOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  genderOptionText: {
    color: colors.textMuted,
    fontSize: 16,
    marginLeft: 5,
  },
  intentionContainer: {
    marginBottom: 20,
  },
  intentionOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  referralContainer: {
    marginBottom: 20,
  },
  referralOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionText: {
    color: colors.textMuted,
    fontSize: 16,
    marginLeft: 5,
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
