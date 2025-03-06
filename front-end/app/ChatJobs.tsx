import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, getMessagesBetween } from '@/services/chatService';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API = process.env.EXPO_URL_APIWS || "ws://192.168.0.28:8084";

// Definimos la interfaz para los mensajes
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  jobId: string;
  text: string;
  createdAt: string;
}

export default function ChatJobs() {
  const { token } = useAuth();
  const router = useRouter();
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const ws = useRef<WebSocket | null>(null);
  const params = useLocalSearchParams();
  const { jobId, employerProfile } = params;
  // Convertir jobId a string si es un arreglo
  const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;

  // Extraer el perfil del empleador desde los parámetros de la ruta
  // Convertir employerProfile a string
  const employerProfileStr = Array.isArray(employerProfile) ? employerProfile[0] : employerProfile;

  useEffect(() => {
    if (employerProfileStr) {
      try {
        const profile = JSON.parse(decodeURIComponent(employerProfileStr));
        setChatPartner(profile);
      } catch (error) {
        console.error('Error al parsear employerProfile:', error);
      }
    }
  }, [employerProfileStr]);

  // Cargar información del usuario actual desde AsyncStorage
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const id = await AsyncStorage.getItem('id');
        const avatar = await AsyncStorage.getItem('avatar');
        const nameUser = await AsyncStorage.getItem('nameUser');
        setCurrentUser({ id: id || '', avatar, nameUser });
      } catch (err) {
        console.error('Error al cargar info del usuario:', err);
      }
    };
    loadCurrentUser();
  }, []);

  // Función para cargar los mensajes entre el usuario actual y el chat partner
  const loadMessages = async () => {
    if (!token || !currentUser || !chatPartner) return;
    setLoading(true);
    try {
      const data = await getMessagesBetween(currentUser.id, chatPartner.id, token);
      setMessages(data || []);
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [token, currentUser, chatPartner]);

  // Suscribirse a WebSocket para recibir mensajes en tiempo real
  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    const subscribeWebSocket = async () => {
      if (!currentUser || !chatPartner) return;
      ws.current = new WebSocket(`${API}/chat/subscribe/${jobIdStr}`);
      ws.current.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Ignorar mensajes tipo "pong"
          if (message.type && message.type === 'pong') {
            return;
          }
          // Verificar que el mensaje pertenezca a la conversación actual
          if (
            (message.senderId === chatPartner.id && message.receiverId === currentUser.id) ||
            (message.senderId === currentUser.id && message.receiverId === chatPartner.id)
          ) {
            setMessages(prevMessages => [...prevMessages, message]);
          }
        } catch (error) {
          console.error('Error al parsear mensaje de WebSocket:', error);
        }
      };
      ws.current.onerror = (e) => {
        console.error('WebSocket error');
      };
      ws.current.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
      };
    };
    subscribeWebSocket();
    return () => {
      if (ws.current) ws.current.close();
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [currentUser, chatPartner, jobIdStr]);

  // Función para enviar un mensaje
  const handleSend = async () => {
    if (!newMessage.trim() || !token || !currentUser || !chatPartner) return;
    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId: chatPartner.id,
        jobId: jobIdStr,
        text: newMessage.trim(),
      };
      const res = await sendChatMessage(messageData, token);
      if (res) {
        if (res.data === "no se puede chatear: el trabajo está completado") {
          Alert.alert('No se puede chatear: el trabajo está completado');
        }
        setNewMessage('');
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Chat con {chatPartner ? chatPartner.nameUser : '...'}
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" />
      ) : (
        <ScrollView
          style={styles.messagesContainer}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((item) => (
            <View key={item.id} style={styles.messageContainer}>
              <Text style={styles.messageSender}>
                {item.senderId === currentUser.id ? currentUser.nameUser : chatPartner.nameUser}
              </Text>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.messageDate}>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#888"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 16,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
  },
  messageContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  messageSender: {
    fontSize: 14,
    color: '#BB86FC',
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
    color: '#E0E0E0',
    marginVertical: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#E0E0E0',
  },
  sendButton: {
    backgroundColor: '#03DAC5',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  sendButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
});
