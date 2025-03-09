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
import { useAuth } from "@/context/AuthContext";
import {
    sendSupportMessage,
    getSupportMessages,
    subscribeSupportMessages,
    SupportMessage,
} from "@/services/supportChat";
import { useRouter } from "expo-router";

export interface User {
    id: string;
    NameUser: string;
    Avatar?: string;
}

interface SupportChatProps {
    visible: boolean;
    onClose: () => void;
    token: string;
    userProfile: User; // Usuario al que se le enviarán mensajes
}

const SupportChatAdmin: React.FC<SupportChatProps> = ({
    visible,
    onClose,
    token,
    userProfile,
}) => {
    const { loadCurrentUser } = useAuth();
    const router = useRouter();
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [supportNewMessage, setSupportNewMessage] = useState<string>("");
    const [loadingSupport, setLoadingSupport] = useState<boolean>(false);
    const [supportAgent, setSupportAgent] = useState<User | null>(null);
    const supportWsRef = useRef<WebSocket | null>(null);

    // Obtener información del agente de soporte (usando loadCurrentUser)
    useEffect(() => {
        if (visible && token && !supportAgent) {
            loadCurrentUser()
                .then((agentData) => {
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

    // Conexión WebSocket
    useEffect(() => {
        if (visible && token && supportAgent) {
            loadSupportChatMessages();
            const roomKey = supportAgent.id + userProfile.id;
            const ws = subscribeSupportMessages(roomKey, (data: string) => {
                try {
                    const message: SupportMessage = JSON.parse(data);
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

    const handleSendSupportMessage = async () => {
        if (!supportNewMessage.trim() || !token || !userProfile || !supportAgent) return;
        try {
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

    // Renderizado de cada mensaje con burbuja y estilo condicional
    const renderMessage = ({ item }: { item: SupportMessage }) => {
        const isMyMessage = item.senderId === supportAgent?.id;
        return (
            <View
                style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.partnerMessage,
                ]}
            >
                <Text style={[
                    isMyMessage ? styles.messageTextParner : styles.messageText,
                ]}>{item.text}</Text>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                    {/* Cabecera con información del usuario: al tocar se dirige al perfil */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.profileInfo}
                            onPress={() => {
                                if (userProfile && userProfile.id) {
                                    router.push(`/profile/ProfileVisited?id=${userProfile.id}`);
                                }
                            }}
                        >
                            <Image
                                source={{ uri: userProfile.Avatar || "https://via.placeholder.com/40" }}
                                style={styles.headerAvatar}
                            />
                            <Text style={styles.headerName}>{userProfile.NameUser}</Text>
                        </TouchableOpacity>
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
                            renderItem={renderMessage}
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
        color: "#E0E0E0",
        fontWeight: "bold",
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
    // Estilos para las burbujas de mensaje
    messageBubble: {
        maxWidth: "75%",
        borderRadius: 16,
        padding: 12,
        marginVertical: 4,
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#03DAC5",
    },
    partnerMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#333",
    },
    messageText: {
        fontSize: 16,
        color: "#ffff",
    },
    messageTextParner: {
        fontSize: 16,
        color: "#333",
    },
});

export default SupportChatAdmin;
