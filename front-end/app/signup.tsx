import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { SaveUserCodeConfirm, SignupService } from '@/services/authService';

export default function SignupScreen() {
  const [nameUser, setNameUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Almacenamos el código como número. Inicialmente 0 o puedes utilizar otro valor "nulo".
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const HandleSaveUserCodeConfirm = async () => {
    try {
      // Enviamos el código ya convertido a número
      const resConfirm = await SaveUserCodeConfirm(code);
      login(resConfirm.data, resConfirm._id);
      router.replace('(protected)/view1' as any);
    } catch (error) {
      console.error(error);
      alert('Error al confirmar el código');
    }
  };

  const handleSignup = async () => {
    try {
      const data = await SignupService(email, password, nameUser);
      if (data) {
        console.log(data);
        if (data.message === "email to confirm") {
          setShowCodeInput(true);
        }
      } else {
        alert('Error en el signup');
      }
    } catch (error) {
      console.error(error);
      alert('Ocurrió un error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        value={nameUser}
        onChangeText={setNameUser}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Signup" onPress={handleSignup} />
      <Button title="Ir a Login" onPress={() => router.push('/login' as any)} />

      {showCodeInput && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el código recibido"
            value={code}
            onChangeText={setCode}
          />
          <Button title="Confirmar Código" onPress={HandleSaveUserCodeConfirm} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});
