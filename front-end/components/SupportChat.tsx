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
} from "react-native";
import {
    sendSupportMessage,
    getSupportMessages,
    subscribeSupportMessages,
    SupportMessage,
    GetSupportAgent,
} from "@/services/supportChat";
import { useAuth } from "@/context/AuthContext";

// Interfaz para el usuario (ajústala según tu modelo)
export interface User {
    id: string;
    NameUser: string;
    Avatar?: string;
}

// Props que recibe el componente de chat de soporte
interface SupportChatProps {
    visible: boolean;
    onClose: () => void;
    token: string;
    userProfile: User; // mandar msj
}

const SupportChat: React.FC<SupportChatProps> = ({ visible, onClose, token, userProfile }) => {
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [supportNewMessage, setSupportNewMessage] = useState<string>("");
    const [loadingSupport, setLoadingSupport] = useState<boolean>(false);
    // Se almacenará la información del agente de soporte obtenida del endpoint
    const [supportAgent, setSupportAgent] = useState<User | null>(null);
    const supportWsRef = useRef<WebSocket | null>(null);

    // Obtención del agente de soporte desde el endpoint
    useEffect(() => {
        if (visible && token && userProfile.id && !supportAgent) {
            GetSupportAgent(token)
                .then((agentResponse) => {
                    console.log(agentResponse);

                    // Se espera que el endpoint retorne: { supportAgent: { id: "xxx", NameUser: "Soporte" } }
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

    // Una vez obtenido el agente, establecemos la conexión WebSocket
    useEffect(() => {
        if (visible && token && userProfile.id && supportAgent) {
            loadSupportChatMessages();
            const ws = subscribeSupportMessages(supportAgent.id, (data: string) => {
                try {
                    const message: SupportMessage = JSON.parse(data);
                    // Verifica que el mensaje pertenezca a la conversación actual
                    if (
                        (message.senderId === supportAgent.id && message.receiverId === userProfile.id) ||
                        (message.senderId === userProfile.id && message.receiverId === supportAgent.id)
                    ) {
                        setSupportMessages((prev) => [...prev, message]);
                    }
                } catch (error) {

                    console.error("Error al parsear mensaje de soporte:", error);
                }
            });
            supportWsRef.current = ws;
            return () => {
                ws.close();
            };
        }
    }, [visible, token, userProfile, supportAgent]);

    // Cargar historial de mensajes
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
        }
    };

    // Enviar mensaje de soporte
    const handleSendSupportMessage = async () => {
        if (!supportNewMessage.trim() || !token || !userProfile || !supportAgent) return;
        try {
            const messageData = {
                senderId: userProfile.id,
                receiverId: supportAgent.id,
                text: supportNewMessage.trim(),
            };
            const res = await sendSupportMessage(messageData, token);
            if (res) {
                setSupportNewMessage("");
            }
        } catch (error) {
            console.error("Error al enviar mensaje de soporte:", error);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Chat con {supportAgent ? supportAgent.NameUser : "Soporte"}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.modalClose}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingSupport ? (
                        <ActivityIndicator size="large" color="#03DAC5" />
                    ) : (
                        <FlatList
                            data={supportMessages}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.messageContainer}>
                                    <Text style={styles.messageSender}>
                                        {item.senderId === userProfile.id
                                            ? userProfile.NameUser
                                            : supportAgent
                                                ? supportAgent.NameUser
                                                : "Soporte"}
                                    </Text>
                                    <Text style={styles.messageText}>{item.text}</Text>
                                </View>
                            )}
                            contentContainerStyle={{ padding: 10 }}
                        />
                    )}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#888"
                            value={supportNewMessage}
                            onChangeText={setSupportNewMessage}
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
        backgroundColor: "#1E1E1E",
        borderRadius: 12,
        padding: 20,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#E0E0E0",
    },
    modalClose: {
        fontSize: 16,
        color: "#03DAC5",
    },
    messageContainer: {
        backgroundColor: "#1E1E1E",
        borderRadius: 8,
        padding: 10,
        marginVertical: 4,
    },
    messageSender: {
        fontSize: 14,
        color: "#BB86FC",
        fontWeight: "bold",
    },
    messageText: {
        fontSize: 16,
        color: "#E0E0E0",
        marginVertical: 4,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#444",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: "#E0E0E0",
    },
    sendButton: {
        backgroundColor: "#03DAC5",
        padding: 12,
        borderRadius: 8,
        marginLeft: 8,
    },
    sendButtonText: {
        color: "#121212",
        fontWeight: "bold",
    },
});

export default SupportChat;
