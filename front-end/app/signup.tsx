import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { SaveUserCodeConfirm, SignupService } from '@/services/authService';

export default function SignupScreen() {
  const [nameUser, setNameUser] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Fecha de nacimiento en formato "DD-MM-YYYY"
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  // Validación básica para el formato "DD-MM-YYYY"
  const validateBirthDate = (dateStr: string): boolean => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    return regex.test(dateStr);
  };

  const handleSignup = async () => {
    setErrorMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!validateBirthDate(birthDate)) {
      setErrorMessage('La fecha de nacimiento debe tener el formato DD-MM-YYYY');
      return;
    }
    try {
      // Convertir "DD-MM-YYYY" a "YYYY-MM-DD" para el backend
      const [dd, mm, yyyy] = birthDate.split('-');
      const formattedBirthDate = `${yyyy}-${mm}-${dd}`;
      const data = await SignupService(email, password, nameUser, fullName, formattedBirthDate, sex);
      if (data) {
        if (data.message === "email to confirm") {
          await handleSaveUserCodeConfirm(data.code);
        } else {
          if (data.code === 409 || data.message.toLowerCase().includes("409")) {
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
      await login(resConfirm.token, resConfirm._id, resConfirm.avatar, resConfirm.nameUser);
      router.push('/(protected)/home');
    } catch (error) {
      console.error(error);
      setErrorMessage('Error al confirmar el código');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
      <TextInput
        style={styles.input}
        placeholder="Fecha de nacimiento (DD-MM-YYYY)"
        placeholderTextColor="#888"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numeric"
      />
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
            <Text style={[
              styles.genderOptionText,
              // sex === 'Masculino' && styles.genderOptionTextSelected
            ]}>
              Masculino
            </Text>
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
            <Text style={[
              styles.genderOptionText,
              // sex === 'Femenino' && styles.genderOptionTextSelected
            ]}>
              Femenino
            </Text>
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
    backgroundColor: '#0f2027', // Fondo principal
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 30,
    textAlign: 'center',
    color: '#E0E0E0',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF5252',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#203a43', // Contenedor secundario
    borderColor: '#2c5364', // Borde activo
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#E0E0E0',
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  inputWithIcon: {
    flex: 1,
    paddingRight: 40, // Espacio para el ícono
  },
  iconContainer: {
    position: 'absolute',
    right: 10,
  },
  genderContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderOptionText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginLeft: 5,
  },
  genderOptionTextSelected: {
    color: '#0f2027',
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#03DAC5', // Botón primario (acento)
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  signupButtonText: {
    color: '#0f2027',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2c5364',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  loginButtonText: {
    color: '#03DAC5',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
