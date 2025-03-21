import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { sendChatMessage, getMessagesBetween } from '@/services/chatService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Constants from "expo-constants";
const API = Constants.expoConfig?.extra?.EXPO_URL_APIWS ?? "http://192.168.0.28:90000";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  jobId: string;
  text: string;
  createdAt: string;
}

type GroupedItem =
  | { type: 'date'; date: Date; label: string }
  | { type: 'message'; message: Message };

export default function ChatJobs() {
  const { token } = useAuth();
  const router = useRouter();
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const ws = useRef<WebSocket | null>(null);
  const params = useLocalSearchParams();
  const { jobId, employerProfile } = params;
  const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;
  const employerProfileStr = Array.isArray(employerProfile)
    ? employerProfile[0]
    : employerProfile;

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
          if (message.type && message.type === 'pong') return;
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

  const handleSend = async () => {
    if (!newMessage.trim() || !token || !currentUser || !chatPartner) return;
    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId: chatPartner.id,
        jobId: jobIdStr,
        text: newMessage.trim(),
      };
      setNewMessage('');
      const res = await sendChatMessage(messageData, token);
      if (res) {
        if (res.data === "no se puede chatear: el trabajo está completado") {
          Alert.alert('No se puede chatear: el trabajo está completado');
        }
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    }
  };

  // --- Funciones de Formateo de Fecha ---

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getDateLabel = (date: Date): string => {
    const now = new Date();
    if (isSameDay(date, now)) return "";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(date, yesterday)) return "Ayer";
    // Calcular inicio de la semana (suponiendo lunes como primer día)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek - 1));
    if (date >= startOfWeek) {
      const weekdays = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      return weekdays[dayIndex];
    }
    // Si es de otra semana: mostrar día y mes
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Agrupar mensajes: se insertan etiquetas cuando cambia el día
  const groupMessages = (msgs: Message[]): GroupedItem[] => {
    const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const grouped: GroupedItem[] = [];
    let lastDate: Date | null = null;
    sorted.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        const label = getDateLabel(msgDate);
        // Si el label está vacío (es hoy), podemos omitir la etiqueta o mostrar "Hoy"
        grouped.push({ type: 'date', date: msgDate, label: label || "Hoy" });
        lastDate = msgDate;
      }
      grouped.push({ type: 'message', message: msg });
    });
    return grouped;
  };

  // Formatear hora (sin segundos)
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Renderizado ---

  // Placeholders mientras carga (burbujas vacías)
  const renderPlaceholders = () => {
    const placeholders = [1, 2];
    return placeholders.map((item) => (
      <View key={`placeholder-${item}`} style={styles.placeholderBubble}>
        <View style={styles.placeholderText} />
      </View>
    ));
  };

  // Renderizar cada elemento (mensaje o etiqueta)
  const renderGroupedItem = (item: GroupedItem, index: number) => {
    if (item.type === 'date') {
      return (
        <View key={`date-${index}`} style={styles.dateLabelContainer}>
          <Text style={styles.dateLabelText}>{item.label}</Text>
        </View>
      );
    } else {
      const msg = item.message;
      const isCurrentUser = msg.senderId === currentUser.id;
      return (
        <View
          key={msg.id}
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.myMessage : styles.partnerMessage,
          ]}
        >
          <Text style={isCurrentUser ? styles.messageText : styles.messageTextPartner}>{msg.text}</Text>
          <Text style={styles.messageDate}>{formatTime(new Date(msg.createdAt))}</Text>
        </View>
      );
    }
  };

  const groupedMessages = groupMessages(messages);

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        {/* <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#E0E0E0" />
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => {
            if (chatPartner && chatPartner.id) {
              router.push(`/profile/ProfileVisited?id=${chatPartner.id}`);
            }
          }}
        >
          <Image
            source={{ uri: chatPartner?.avatar || 'https://via.placeholder.com/40' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerName}>
            {chatPartner?.nameUser || '...'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? renderPlaceholders() : groupedMessages.map(renderGroupedItem)}
      </ScrollView>

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
    backgroundColor: '#0f2027',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#203a43',
  },
  backButton: {
    marginRight: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  headerName: {
    fontSize: 18,
    color: '#E0E0E0',
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#203a43',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2c5364',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#E0E0E0',
    backgroundColor: '#0f2027',
  },
  sendButton: {
    backgroundColor: '#03DAC5',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  sendButtonText: {
    color: '#0f2027',
    fontWeight: 'bold',
  },
  // Estilos para mensajes
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#03DAC5',
  },
  partnerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#203a43',
    borderWidth: 1,
    borderColor: '#2c5364',
  },
  messageText: {
    fontSize: 16,
    color: '#0f2027',
  },
  messageTextPartner: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  messageDate: {
    fontSize: 12,
    color: '#2c5364',
    textAlign: 'right',
    marginTop: 4,
  },
  // Placeholder
  placeholderBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#203a43',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    opacity: 0.5,
  },
  placeholderText: {
    height: 20,
    backgroundColor: '#2c5364',
    borderRadius: 4,
  },
  // Etiqueta de fecha
  dateLabelContainer: {
    alignSelf: 'center',
    backgroundColor: '#2c5364',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  dateLabelText: {
    fontSize: 14,
    color: '#E0E0E0',
  },
});
