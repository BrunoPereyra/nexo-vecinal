import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Modal,
    Alert,
    TextInput,
} from "react-native";
import colors from "@/style/colors";
import { Job } from "@/services/JobsService";
import { createOrUpdateContentReport } from "@/services/reports";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface JobCardProps {
    job: Job;
    onPress: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
    const truncateDescription = (text: string, maxLength: number) =>
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    const { token } = useAuth();
    // Valor animado para la escala de la imagen
    const scaleValue = useRef(new Animated.Value(1)).current;
    // Estado para mostrar la imagen en grande en un modal
    const [enlargedVisible, setEnlargedVisible] = useState(false);

    const handleLongPressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 1.2,
            useNativeDriver: true,
        }).start();
        // Solo abre el modal si existe al menos una imagen
        if (job.Images?.length > 0) {
            setEnlargedVisible(true);
        }
    };

    const handleLongPressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportDescription, setReportDescription] = useState("");

    const sendReport = async () => {
        if (!reportDescription.trim()) {
            Alert.alert("Error", "La descripción no puede estar vacía.");
            return;
        }
        try {
            await createOrUpdateContentReport(
                {
                    contentType: "job",
                    description: reportDescription,
                    reportedContentId: job.id,
                },
                token as string
            );
            Alert.alert("Gracias", "Tu reporte ha sido enviado.");
            setReportModalVisible(false);
        } catch (e: any) {
            console.error(e);
            Alert.alert("Error", "No se pudo enviar el reporte.");
        }
    };
    const openReportModal = () => {
        setReportDescription("");
        setReportModalVisible(true);
    };
    return (
        <>
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                <TouchableOpacity
                    style={styles.cardContainer}
                    onPress={onPress}
                    activeOpacity={0.7}

                >
                    <Image
                        source={{
                            uri: job.userDetails?.avatar ||
                                "https://www.pinkker.tv/uploads/imgs/assets/avatar_default/Fotoperfil1.png",
                        }}
                        style={styles.avatar}
                    />
                    {/* Nuevo contenedor para el contenido que expanda el ancho restante */}
                    <View style={styles.contentContainer}>
                        {/* Sección de usuario en la parte superior */}
                        <View style={styles.userDetailsContainer}>
                            <Text style={styles.userName}>
                                {job.userDetails?.nameUser || "Usuario Desconocido"}
                            </Text>
                            {/* NUEVO BOTÓN DE REPORTE */}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={openReportModal}
                            >
                                <Ionicons
                                    name="flag-outline"
                                    size={20}
                                    color={colors.textDark}
                                />
                            </TouchableOpacity>

                        </View>

                        <Text style={styles.title}>{job.title}</Text>
                        <Text style={styles.description}>
                            {truncateDescription(job.description, 100)}
                        </Text>

                        {/* Imagen del trabajo (si existe) */}
                        {job.Images?.[0] && (
                            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onLongPress={handleLongPressIn}
                                    onPressOut={handleLongPressOut}
                                >
                                    <Image
                                        source={{ uri: job.Images[0] }}
                                        style={styles.jobImage}
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        <View style={styles.budgetContainer}>
                            <Text style={styles.budgetText}>
                                Presupuesto: ${job.budget?.toFixed(2) || "N/A"}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

            </Animated.View>

            <Modal
                visible={reportModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.reportModal}>
                        <Text style={styles.modalTitle}>Reportar este trabajo</Text>
                        <TextInput
                            style={styles.reportInput}
                            placeholder="Descripción del reporte"
                            multiline
                            value={reportDescription}
                            onChangeText={setReportDescription}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.borderLight }]}
                                onPress={() => setReportModalVisible(false)}
                            >
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.gold }]}
                                onPress={sendReport}
                            >
                                <Text>Enviar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal para mostrar la imagen en grande */}
            {job.Images?.[0] && (
                <Modal
                    visible={enlargedVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setEnlargedVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        onPress={() => setEnlargedVisible(false)}
                        activeOpacity={1}
                    >
                        <Image
                            source={{ uri: job.Images[0] }}
                            style={styles.enlargedImage}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        paddingRight: 26,
        paddingBlock: 16,
        shadowOpacity: 0.15,
        flexDirection: "row",
        // marginRight: 40
    },
    contentContainer: {
        flex: 1, // Esto hace que el contenedor ocupe todo el espacio disponible
    },
    userDetailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        // marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 5,
    },
    userName: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: "bold",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: colors.textDark,
        // marginBottom: 8,
        lineHeight: 20,
    },
    jobImage: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    budgetContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    budgetText: {
        fontSize: 14,
        color: colors.textGrey,
        fontWeight: "bold",
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    enlargedImage: {
        width: "90%",
        height: "90%",
    },
    // report 
    reportModal: {
        width: "85%",
        backgroundColor: colors.warmWhite,
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: colors.textDark,
    },
    reportInput: {
        height: 100,
        borderColor: colors.borderLight,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 20,
        textAlignVertical: "top",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        marginLeft: 10,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
    },
});

export default JobCard;
