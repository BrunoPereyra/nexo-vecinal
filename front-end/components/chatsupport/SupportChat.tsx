import React, { useEffect, useState, useRef } from "react";
import {
    View,
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    TextInput,
    Image,
} from "react-native";
import {
    sendSupportMessage,
    getSupportMessages,
    subscribeSupportMessages,
    SupportMessage,
    GetSupportAgent,
} from "@/services/supportChat";
import { MaterialIcons } from '@expo/vector-icons';

// Interfaz para el usuario
export interface User {
    id: string;
    NameUser: string;
    Avatar?: string;
}

interface SupportChatProps {
    visible: boolean;
    onClose: () => void;
    token: string;
    userProfile: User; // Perfil del usuario que envía mensajes
}

const SupportChat: React.FC<SupportChatProps> = ({
    visible,
    onClose,
    token,
    userProfile,
}) => {
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [supportNewMessage, setSupportNewMessage] = useState<string>("");
    const [loadingSupport, setLoadingSupport] = useState<boolean>(false);
    const [supportAgent, setSupportAgent] = useState<User | null>(null);
    const supportWsRef = useRef<WebSocket | null>(null);
    const flatListRef = useRef<FlatList<SupportMessage>>(null);
    // Ref para evitar múltiples suscripciones
    const subscribedRef = useRef<boolean>(false);

    // Obtener información del agente de soporte
    useEffect(() => {
        if (visible && token && userProfile.id && !supportAgent) {
            GetSupportAgent(token)
                .then((agentResponse) => {
                    if (agentResponse && agentResponse.supportAgent) {
                        setSupportAgent(agentResponse.supportAgent);
                    } else {
                        throw new Error("No se recibió la información del agente");
                    }
                })
                .catch((error) => {
                    console.error("Error al obtener el agente de soporte:", error);
                    Alert.alert("Error", "No se pudo obtener la información del agente de soporte.");
                });
        }
    }, [visible, token, userProfile, supportAgent]);

    // Conexión WebSocket y suscripción (se suscribe solo una vez)
    useEffect(() => {
        if (visible && token && userProfile.id && supportAgent && !subscribedRef.current) {
            loadSupportChatMessages();
            const roomKey = supportAgent.id + userProfile.id;
            const ws = subscribeSupportMessages(roomKey, (data: string) => {
                try {
                    const message: SupportMessage = JSON.parse(data);
                    // Evitamos duplicados verificando por ID (asumiendo que cada mensaje tiene un ID único)
                    setSupportMessages((prev) => {
                        if (prev.find((m) => m.id === message.id)) {
                            return prev;
                        }
                        return [...prev, message];
                    });
                } catch (error) {

                    console.error("Error al parsear mensaje de soporte:", error);
                }
            });
            supportWsRef.current = ws;
            subscribedRef.current = true;
            return () => {
                ws.close();
                subscribedRef.current = false;
            };
        }
    }, [visible, token, userProfile, supportAgent]);

    const loadSupportChatMessages = async () => {
        if (!token || !userProfile || !supportAgent) return;
        setLoadingSupport(true);
        try {
            const messages = await getSupportMessages(userProfile.id, supportAgent.id, token);
            setSupportMessages(messages || []);
        } catch (error) {
            console.error("Error al cargar mensajes de soporte:", error);
        } finally {
            setLoadingSupport(false);
            // Después de cargar, desplazarse al final con un pequeño retraso
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const handleSendSupportMessage = async () => {
        if (!supportNewMessage.trim() || !token || !userProfile || !supportAgent) return;
        try {
            const messageData = {
                senderId: userProfile.id,
                receiverId: supportAgent.id,
                text: supportNewMessage.trim(),
            };
            const res = await sendSupportMessage(messageData, token);
            setSupportNewMessage("");
            // Opcional: Si el WS no envía el mensaje automáticamente, podrías agregarlo manualmente
            // setSupportMessages(prev => [...prev, { ...messageData, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
        } catch (error) {
            console.error("Error al enviar mensaje de soporte:", error);
        }
    };

    // Desplaza el scroll al final cada vez que cambia el contenido de la lista
    const handleContentSizeChange = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    const renderMessage = ({ item }: { item: SupportMessage }) => {
        const isMyMessage = item.senderId === userProfile.id;
        return (
            <View
                style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.partnerMessage,
                ]}
            >
                <Text style={isMyMessage ? styles.messageTextParner : styles.messageText}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" style={[styles.modalContent, { minHeight: "80%", maxHeight: "80%" }]}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                    <View style={styles.modalHeader}>
                        {supportAgent && (
                            <Image
                                source={{ uri: supportAgent.Avatar || "https://via.placeholder.com/40" }}
                                style={styles.headerAvatar}
                            />
                        )}
                        <Text style={styles.modalTitle}>
                            {supportAgent ? supportAgent.NameUser : "Soporte"}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialIcons name="close" size={28} color="#03DAC5" />
                        </TouchableOpacity>

                    </View>
                    <View style={styles.messageListWrapper}>
                        {loadingSupport ? (
                            <ActivityIndicator size="large" color="#03DAC5" />
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={supportMessages}
                                renderItem={renderMessage}
                                contentContainerStyle={{
                                    padding: 10,
                                    flexGrow: 1,
                                    justifyContent: supportMessages.length === 0 ? "center" : "flex-start",
                                }}
                                onContentSizeChange={handleContentSizeChange}
                            />
                        )}
                    </View>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#888"
                            value={supportNewMessage}
                            onChangeText={setSupportNewMessage}
                            onSubmitEditing={handleSendSupportMessage} // Permite enviar con Enter
                            blurOnSubmit={false} // Evita que el teclado se cierre automáticamente
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendSupportMessage}>
                            <Text style={styles.sendButtonText}>Enviar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: "#203a43", // Contenedor secundario
        borderRadius: 12,
        padding: 20,
        elevation: 6,
        height: "80%",
        borderWidth: 1,
        borderColor: "#2c5364", // Borde destacado
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
    },
    modalTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
        color: "#E0E0E0",
    },
    modalClose: {
        fontSize: 16,
        color: "#03DAC5",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#2c5364", // Borde destacado
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#0f2027", // Fondo principal
        color: "#E0E0E0",
    },
    sendButton: {
        backgroundColor: "#03DAC5", // Acento
        padding: 12,
        borderRadius: 8,
        marginLeft: 8,
    },
    sendButtonText: {
        color: "#0f2027",
        fontWeight: "bold",
    },
    messageBubble: {
        maxWidth: "75%",
        borderRadius: 16,
        padding: 12,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: "#2c5364", // Borde para distinguir
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#03DAC5", // Acento para mis mensajes
    },
    partnerMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#203a43", // Contenedor secundario para los mensajes del otro
    },
    messageText: {
        fontSize: 16,
        color: "#E0E0E0",
    },
    messageTextParner: {
        fontSize: 16,
        color: "#E0E0E0",
    },
    messageListWrapper: {
        flex: 1,
    },
});


export default SupportChat;
