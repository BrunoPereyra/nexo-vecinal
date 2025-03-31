import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Modal,
} from "react-native";
import colors from "@/style/colors";
import { Job } from "@/services/JobsService";

interface JobCardProps {
    job: Job;
    onPress: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
    const truncateDescription = (text: string, maxLength: number) =>
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

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

    return (
        <>
            <TouchableOpacity
                style={styles.cardContainer}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Sección de usuario en la parte superior */}
                <View style={styles.userDetailsContainer}>
                    <Image
                        source={{
                            uri: job.userDetails?.avatar || "https://via.placeholder.com/50",
                        }}
                        style={styles.avatar}
                    />
                    <Text style={styles.userName}>
                        {job.userDetails?.nameUser || "Usuario Desconocido"}
                    </Text>
                </View>

                <Text style={styles.title}>{job.title}</Text>
                <Text style={styles.description}>
                    {truncateDescription(job.description, 100)}
                </Text>

                {/* Imagen del trabajo (si existe) */}
                {job.Images?.length > 0 && (
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

                <View style={styles.tagsContainer}>
                    {job.tags?.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    )) || <Text style={styles.noTagsText}>Sin etiquetas</Text>}
                </View>
            </TouchableOpacity>

            {/* Modal para mostrar la imagen en grande */}
            {job.Images?.length > 0 && (
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
        backgroundColor: colors.warmWhite,
        padding: 16,
        marginVertical: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 5,
    },
    userDetailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
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
        color: colors.textMuted,
        marginBottom: 8,
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
        marginBottom: 8,
    },
    budgetText: {
        fontSize: 14,
        color: colors.gold,
        fontWeight: "bold",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 8,
    },
    tag: {
        backgroundColor: colors.cream,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: colors.textDark,
    },
    noTagsText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: "italic",
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
});

export default JobCard;
