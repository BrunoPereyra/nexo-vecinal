import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { loginNameUser } from '../services/authService';

export default function LoginScreen() {
  const [nameUser, setNameUser] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const { request, promptAsync } = useGoogleAuth();

  const handleLogin = async () => {
    try {
      const data = await loginNameUser(nameUser, password);

      await login(data.token, data._id, data.avatar, data.nameUser);
      router.replace('/profile' as any);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error desconocido');
      }
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="nameUser"
        value={nameUser}
        onChangeText={setNameUser}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Login con Google"
          onPress={() => promptAsync()}
          disabled={!request}
        />
      </View>
      <Button title="Ir a Signup" onPress={() => router.push('/signup' as any)} />
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
