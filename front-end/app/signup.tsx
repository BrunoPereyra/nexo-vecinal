import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { SaveUserCodeConfirm, SignupService } from '@/services/authService';
import colors from '@/style/colors';

export default function SignupScreen() {
  const [nameUser, setNameUser] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Estado para la fecha de nacimiento: se inicia con la fecha actual
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  // Función para validar el nameUser según las reglas:
  // Longitud entre 3 y 20 y solo caracteres alfanuméricos
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
        sex
      );

      if (data) {
        if (data.message === "email to confirm") {
          await handleSaveUserCodeConfirm(data.code);
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

  const handleSaveUserCodeConfirm = async (code: any) => {
    try {
      const resConfirm = await SaveUserCodeConfirm(code);
      await login(
        resConfirm.token,
        resConfirm._id,
        resConfirm.avatar,
        resConfirm.nameUser
      );
      router.push('/(protected)/home');
    } catch (error) {
      console.error(error);
      setErrorMessage('Error al confirmar el código');
    }
  };

  return (
    <View style={styles.container}>
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
            color="#03DAC5"
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
            color="#03DAC5"
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
        <Text style={styles.label}>Género / Sexo:</Text>
        <View style={styles.genderOptions}>
          <TouchableOpacity
            style={styles.genderOption}
            onPress={() => setSex('Masculino')}
          >
            <Ionicons
              name={sex === 'Masculino' ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={sex === 'Masculino' ? "#03DAC5" : "#888"}
            />
            <Text style={styles.genderOptionText}>Masculino</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.genderOption}
            onPress={() => setSex('Femenino')}
          >
            <Ionicons
              name={sex === 'Femenino' ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={sex === 'Femenino' ? "#03DAC5" : "#888"}
            />
            <Text style={styles.genderOptionText}>Femenino</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Fondo claro
    justifyContent: "center",
    padding: 20,
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
  signupButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#000",
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
    borderColor: colors.borderDark,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  loginButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
});
