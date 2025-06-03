import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { getChatRoom, sendChatMessage, getMessagesBetween, Message, ChatRoom } from '@/services/chatService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from "expo-constants";
import colors from '@/style/colors';
import { useFocusEffect } from '@react-navigation/native';

const APIWS = Constants.expoConfig?.extra?.EXPO_URL_APIWS ?? "http://192.168.0.28:9000";

interface GroupedItem {
  type: 'date' | 'message';
  date?: Date;
  label?: string;
  message?: Message;
}

export default function ChatJobs() {
  const { token } = useAuth();
  const router = useRouter();
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const ws = useRef<WebSocket | null>(null);
  const params = useLocalSearchParams();
  const { employerProfile, origin } = params;
  const employerProfileStr = Array.isArray(employerProfile)
    ? employerProfile[0]
    : employerProfile;

  // Parseo del perfil del partner
  useEffect(() => {
    if (employerProfileStr) {
      try {
        const profile = JSON.parse(decodeURIComponent(employerProfileStr as string));
        setChatPartner(profile);
      } catch (error) {
        console.error('Error al parsear employerProfile:', error);
      }
    }
  }, [employerProfileStr]);

  // Manejo del botón "back" en Android
  useEffect(() => {
    const onBackPress = () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (origin) {
        if (origin === 'agenda') {
          router.push("/(protected)/Agenda/Agenda");
        } else if (origin === 'jobstatus') {
          router.push("/(protected)/jobsStatus/JobDetailWorker");
        } else if (origin === 'profileVisited') {
          router.push("/(protected)/profile/ProfileVisited");
        } else if (origin === 'EmployerJobDetail') {
          router.push("/(protected)/profile/EmployerJobDetail");
        } else if (origin === 'jobDetailWorker') {
          router.push("/(protected)/profile/JobDetailWorker");
        } else if (origin === 'home') {
          router.push("/(protected)/home");
        } else {
          router.back();
        }
        return true;
      }
      return false;
    };
    if (Platform.OS === "android") {
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }
  }, [origin, router]);

  // Carga del usuario actual
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

  // Carga o creación del ChatRoom
  const loadChatRoom = async () => {
    if (!token || !currentUser || !chatPartner) return;
    try {
      const room = await getChatRoom(currentUser.id, chatPartner.id, token);
      if (room) {
        setChatRoom(room);
      }
    } catch (err) {
      console.error('Error al cargar chat room:', err);
    }
  };
  useEffect(() => {
    loadChatRoom();
  }, [token, currentUser, chatPartner]);

  // Carga de mensajes
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

  // Función para suscribir el WebSocket
  const subscribeWebSocket = useCallback(() => {
    if (!chatRoom) return;
    ws.current = new WebSocket(`${APIWS}/chat/subscribe/${chatRoom.id}`);
    let pingInterval: NodeJS.Timeout;
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
        setMessages(prevMessages => [...prevMessages, message]);
      } catch (error) {
        console.error('Error al parsear mensaje de WebSocket:', error);
      }
    };
    ws.current.onerror = () => {
      console.error('WebSocket error');
    };
    ws.current.onclose = () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [chatRoom]);

  // useFocusEffect para gestionar la conexión WebSocket
  useFocusEffect(
    useCallback(() => {
      // Al entrar en foco, si tenemos chatRoom y no hay conexión, suscribir
      if (chatRoom && !ws.current) {
        subscribeWebSocket();
      }
      return () => {
        // Al perder foco, cerramos la conexión
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
      };
    }, [chatRoom, subscribeWebSocket])
  );
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, loading]);

  // Limpieza final cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || !token || !currentUser || !chatPartner) return;
    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId: chatPartner.id,
        text: newMessage.trim(),
      };
      setNewMessage('');
      await sendChatMessage(messageData, token);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    }
  };

  // Funciones de formateo de fecha y agrupado de mensajes
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
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek - 1));
    if (date >= startOfWeek) {
      const weekdays = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      return weekdays[dayIndex];
    }
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  const groupMessages = (msgs: Message[]): GroupedItem[] => {
    const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const grouped: GroupedItem[] = [];
    let lastDate: Date | null = null;
    sorted.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        const label = getDateLabel(msgDate);
        grouped.push({ type: 'date', date: msgDate, label: label || "Hoy" });
        lastDate = msgDate;
      }
      grouped.push({ type: 'message', message: msg });
    });
    return grouped;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupedMessages = groupMessages(messages);

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
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
        {loading ? (
          <>
            <View style={styles.placeholderBubble}>
              <View style={styles.placeholderText} />
            </View>
            <View style={styles.placeholderBubble}>
              <View style={styles.placeholderText} />
            </View>
          </>
        ) : (
          groupedMessages.map((item, index) => {
            if (item.type === 'date') {
              return (
                <View key={`date-${index}`} style={styles.dateLabelContainer}>
                  <Text style={styles.dateLabelText}>{item.label}</Text>
                </View>
              );
            } else {
              const msg = item.message!;
              const isCurrentUser = msg.senderId === currentUser.id;
              return (
                <View
                  key={`message-${msg.id}-${index}`}
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
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#888"
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={handleSend}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.cream,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  headerName: {
    fontSize: 18,
    color: colors.textDark,
    fontWeight: "bold",
  },
  messagesContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.cream,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textDark,
    backgroundColor: colors.warmWhite,
  },
  sendButton: {
    backgroundColor: colors.gold,
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  sendButtonText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.gold,
  },
  partnerMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  messageText: {
    fontSize: 16,
    color: colors.textDark,
  },
  messageTextPartner: {
    fontSize: 16,
    color: colors.textMuted,
  },
  messageDate: {
    fontSize: 12,
    color: colors.borderLight,
    textAlign: "right",
    marginTop: 4,
  },
  placeholderBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.cream,
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    opacity: 0.5,
  },
  placeholderText: {
    height: 20,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
  },
  dateLabelContainer: {
    alignSelf: "center",
    backgroundColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  dateLabelText: {
    fontSize: 14,
    color: colors.textDark,
  },
});

