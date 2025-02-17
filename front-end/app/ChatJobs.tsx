import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, getMessagesBetween } from '@/services/chatService';
import { useLocalSearchParams } from 'expo-router';

export default function ChatJobs() {
  const { token } = useAuth(); // Se asume que el contexto Auth provee el token
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const ws = useRef<WebSocket | null>(null);
  const params = useLocalSearchParams()
  const { jobId } = params;


  // Cargar información del usuario actual desde AsyncStorage
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const id = await AsyncStorage.getItem('id');
        const avatar = await AsyncStorage.getItem('avatar');
        const nameUser = await AsyncStorage.getItem('nameUser');
        setCurrentUser({ id, avatar, nameUser });
      } catch (err) {
        console.error('Error al cargar info del usuario:', err);
      }
    };
    loadCurrentUser();
  }, []);

  // Cargar el perfil del chat partner desde AsyncStorage
  useEffect(() => {
    const loadChatPartner = async () => {
      try {
        const partnerString = await AsyncStorage.getItem('employerProfile');
        if (partnerString) {
          setChatPartner(JSON.parse(partnerString));
        }
      } catch (err) {
        console.error('Error al cargar el perfil del chat partner:', err);
      }
    };
    loadChatPartner();
  }, []);

  // Función para cargar los mensajes entre el usuario actual y el chat partner (para la carga inicial)
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

  // Llama a loadMessages cuando se tengan token, currentUser y chatPartner
  useEffect(() => {
    loadMessages();
  }, [token, currentUser, chatPartner]);

  // Suscribirse a WebSocket para recibir mensajes en tiempo real
  useEffect(() => {
    const subscribeWebSocket = async () => {
      if (!currentUser || !chatPartner) return;
      // Suponemos que se guarda el jobId en AsyncStorage para la conversación (o usa un valor por defecto)
      ws.current = new WebSocket(`ws://192.168.0.11:8084/chat/subscribe/${jobId}`);

      ws.current.onopen = () => {
        console.log('WebSocket conectado');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Verificamos que el mensaje corresponda a la conversación actual
          if (
            (message.senderId === chatPartner.id && message.receiverId === currentUser.id) ||
            (message.senderId === currentUser.id && message.receiverId === chatPartner.id)
          ) {
            console.log('Mensaje recibido:', message);

            setMessages(prevMessages => [...prevMessages, message]);
          }
        } catch (error) {
          console.error('Error al parsear mensaje de WebSocket:', error);
        }
      };

      ws.current.onerror = (e) => {
        console.error('WebSocket error:', e.message);
      };

      ws.current.onclose = () => {
        console.log('WebSocket desconectado');
      };
    };

    subscribeWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [currentUser, chatPartner]);

  // Función para enviar un mensaje
  const handleSend = async () => {
    if (!newMessage.trim() || !token || !currentUser || !chatPartner) return;
    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId: chatPartner.id,
        jobId,
        text: newMessage.trim(),
      };
      const res = await sendChatMessage(messageData, token);
      if (res) {
        console.log(res);

        // En lugar de recargar todos los mensajes, agregamos el mensaje nuevo a la lista
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
                {item.senderId === currentUser.id ? 'Yo' : chatPartner.nameUser}
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
