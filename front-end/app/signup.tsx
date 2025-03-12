import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
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
  // Almacenar la fecha como string en formato "DD-MM-YYYY"
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  // Validación básica para el formato "DD-MM-YYYY"
  const validateBirthDate = (dateStr: string): boolean => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    return regex.test(dateStr);
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (!validateBirthDate(birthDate)) {
      Alert.alert('Error', 'La fecha de nacimiento debe tener el formato DD-MM-YYYY');
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
          Alert.alert('Error', data.message || 'No se pudo crear el usuario.');
        }
      } else {
        Alert.alert('Error', 'Error en el signup');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Ocurrió un error');
    }
  };

  const handleSaveUserCodeConfirm = async (code: any) => {
    try {
      const resConfirm = await SaveUserCodeConfirm(code);
      console.log(resConfirm);
      await login(resConfirm.token, resConfirm._id, resConfirm.avatar, resConfirm.nameUser);
      router.replace('/(protected)/home');
    } catch (error) {
      console.error(error);
      Alert.alert('Error al confirmar el código');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
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
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#03DAC5" />
        </TouchableOpacity>
      </View>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Confirmar Password"
          placeholderTextColor="#888"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#03DAC5" />
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
      <View style={styles.genderContainer}>
        <Text style={styles.label}>Género / Sexo:</Text>
        <View style={styles.genderOptions}>
          <TouchableOpacity
            style={[styles.genderOption, sex === 'Masculino' && styles.genderOptionSelected]}
            onPress={() => setSex('Masculino')}
          >
            <Text style={[styles.genderOptionText, sex === 'Masculino' && styles.genderOptionTextSelected]}>
              Masculino
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderOption, sex === 'Femenino' && styles.genderOptionSelected]}
            onPress={() => setSex('Femenino')}
          >
            <Text style={[styles.genderOptionText, sex === 'Femenino' && styles.genderOptionTextSelected]}>
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
      {/* {showCodeInput && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el código recibido"
            placeholderTextColor="#888"
            value={code}
            onChangeText={setCode}
          />
          <Button title="Confirmar Código" onPress={handleSaveUserCodeConfirm} color="#03DAC5" />
        </>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  input: {
    height: 50,
    backgroundColor: '#1E1E1E',
    borderColor: '#03DAC5',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#E0E0E0',
    borderRadius: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#03DAC5',
  },
  genderOptionSelected: {
    backgroundColor: '#03DAC5',
  },
  genderOptionText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  genderOptionTextSelected: {
    color: '#121212',
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#03DAC5',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  signupButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#03DAC5',
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
