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
import { useAuth } from "@/context/AuthContext";
import {
    sendSupportMessage,
    getSupportMessages,
    subscribeSupportMessages,
    SupportMessage,
} from "@/services/supportChat";

// Interfaz para el usuario (ajústala según tu modelo)
export interface User {
    id: string;
    NameUser: string;
    Avatar?: string;
}

// Props que recibe el componente de chat de soporte
// userProfile es el usuario al que se le enviarán mensajes
interface SupportChatProps {
    visible: boolean;
    onClose: () => void;
    token: string;
    userProfile: User;
}

const SupportChatAdmin: React.FC<SupportChatProps> = ({
    visible,
    onClose,
    token,
    userProfile,
}) => {
    const { loadCurrentUser } = useAuth();
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [supportNewMessage, setSupportNewMessage] = useState<string>("");
    const [loadingSupport, setLoadingSupport] = useState<boolean>(false);
    // supportAgent es la información del agente de soporte (obtenida con loadCurrentUser)
    const [supportAgent, setSupportAgent] = useState<User | null>(null);
    const supportWsRef = useRef<WebSocket | null>(null);

    // Obtener la información del agente de soporte desde loadCurrentUser (solo se ejecuta una vez)
    useEffect(() => {
        if (visible && token && !supportAgent) {
            loadCurrentUser()
                .then((agentData) => {
                    // Se valida que agentData y sus propiedades sean válidas
                    if (agentData && agentData.id && agentData.NameUser && agentData.Avatar) {
                        setSupportAgent({
                            id: agentData.id,
                            NameUser: agentData.NameUser,
                            Avatar: agentData.Avatar,
                        });
                    } else {
                        console.error("El agente no tiene datos válidos");
                    }
                })
                .catch((error) => {
                    console.error("Error al obtener la info del agente de soporte:", error);
                    Alert.alert("Error", "No se pudo obtener la información del agente de soporte.");
                });
        }
    }, [visible, token, supportAgent, loadCurrentUser]);

    // Establecer la conexión WebSocket una vez que se tenga el agente de soporte y el usuario con el que se conversa.
    // Aquí se suscribe a la sala utilizando la concatenación de IDs (supportAgent.id + userProfile.id)
    useEffect(() => {
        if (visible && token && supportAgent) {
            loadSupportChatMessages();
            const roomKey = supportAgent.id + userProfile.id;
            const ws = subscribeSupportMessages(roomKey, (data: string) => {
                try {
                    const message: SupportMessage = JSON.parse(data);
                    // Se filtra para mostrar solo mensajes entre el agente de soporte y el usuario

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

    // Función para cargar el historial de mensajes
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

    // Función para enviar un mensaje de soporte
    const handleSendSupportMessage = async () => {
        if (!supportNewMessage.trim() || !token || !userProfile || !supportAgent) return;
        try {
            // El agente de soporte envía el mensaje (senderId es el agente y receiverId es el usuario)
            const messageData = {
                senderId: supportAgent.id,
                receiverId: userProfile.id,
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
                            Chat con {userProfile.NameUser}
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
                                        {item.senderId === supportAgent?.id
                                            ? supportAgent?.NameUser
                                            : userProfile.NameUser}
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

export default SupportChatAdmin;
