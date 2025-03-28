import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { getChatRoom, sendChatMessage, getMessagesBetween, Message, ChatRoom } from '@/services/chatService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from "expo-constants";
import colors from '@/style/colors';

const APIWS = Constants.expoConfig?.extra?.EXPO_URL_APIWS ?? "http://192.168.0.28:90000";

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
  // Se espera que el partner venga de employerProfile
  const { employerProfile, origin } = params;
  const employerProfileStr = Array.isArray(employerProfile)
    ? employerProfile[0]
    : employerProfile;

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
  // Manejo del botón de hardware "back"

  useEffect(() => {
    const onBackPress = () => {
      // Si el parámetro "origin" existe, se navega a esa pestaña.
      if (origin) {
        // Por ejemplo, si origin === 'agenda', se navega a la pestaña Agenda.
        // Ajusta las rutas según tu estructura.
        if (origin === 'agenda') {
          router.push("/(protected)/Agenda/Agenda");

        } else if (origin === 'jobstatus') {
          router.push("/(protected)/jobsStatus/JobDetailWorker");
        }
        else if (origin === 'profileVisited') {
          router.push("/(protected)/profile/ProfileVisited");
        } else if (origin === 'EmployerJobDetail') {
          router.push("/(protected)/profile/EmployerJobDetail");
        } else if (origin === 'jobDetailWorker') {
          router.push("/(protected)/profile/JobDetailWorker");
        } else {
          router.back();
        }
        return true; // se consume el evento
      }
      return false;
    };

    if (Platform.OS === "android") {
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }
  }, [origin, router]);
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

  // Solicita o crea el ChatRoom usando el ID del usuario actual y el del partner.
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

  // Conecta al WebSocket usando el chatRoom.id (ya no se usa jobId)
  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    const subscribeWebSocket = () => {
      if (!chatRoom) return;
      ws.current = new WebSocket(`${APIWS}/chat/subscribe/${chatRoom.id}`);
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
          // Se asume que el mensaje recibido corresponde al chat actual.
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
    };
    subscribeWebSocket();
    return () => {
      if (ws.current) ws.current.close();
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [chatRoom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !token || !currentUser || !chatPartner) return;
    try {
      const messageData = {
        senderId: currentUser.id,
        receiverId: chatPartner.id,
        text: newMessage.trim(),
      };
      setNewMessage('');
      const res = await sendChatMessage(messageData, token);
      if (res) {
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

  // Agrupa mensajes insertando etiquetas de fecha cuando cambia el día.
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
    backgroundColor: colors.background, // "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.cream, // "#FFF8DC"
  },
  backButton: {
    marginRight: 12,
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
    color: colors.textDark, // "#333"
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
    backgroundColor: colors.cream, // "#FFF8DC"
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textDark, // "#333"
    backgroundColor: colors.warmWhite, // "#FAF9F6"
  },
  sendButton: {
    backgroundColor: colors.gold, // "#FFD700"
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  sendButtonText: {
    color: colors.textDark, // "#333"
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
    backgroundColor: colors.gold, // "#03DAC5"
  },
  partnerMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.cream, // "#FFF8DC"
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  messageText: {
    fontSize: 16,
    color: colors.textDark, // "#333"
  },
  messageTextPartner: {
    fontSize: 16,
    color: colors.textMuted, // "#888"
  },
  messageDate: {
    fontSize: 12,
    color: colors.borderLight, // "#EAE6DA"
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
