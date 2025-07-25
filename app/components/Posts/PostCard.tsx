import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import colors from "@/style/colors";
import { Post } from "@/services/posts";
import PostDetailView from "./PostDetailView";
import { createOrUpdateContentReport } from "@/services/reports";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/services/JobsService";

interface PostCardProps {
    post: Post;
    onLike?: (postId: string) => void;
    onDislike?: (postId: string) => void;
    onComment?: (postId: string) => void;
    onShare?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({
    post,
    onLike,
    onDislike,
    onComment,
    onShare,
}) => {
    const truncateDescription = (text: string, maxLength: number) =>
        text?.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    const { token } = useAuth();

    // Valor animado para la escala de la imagen
    const scaleValue = new Animated.Value(1);
    // Estado para mostrar la imagen en grande en un modal
    const [enlargedVisible, setEnlargedVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    // --- ESTADOS PARA EL MODAL DE REPORT ---
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
                    contentType: "post",
                    description: reportDescription,
                    reportedContentId: post.id,
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
    const handleLongPressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 1.2,
            useNativeDriver: true,
        }).start();
        if (post.Images?.length > 0) {
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

    // Funciones internas para las acciones
    const handleLike = () => {
        if (onLike) {
            onLike(post.id);
        }
    };
    const handledisLike = () => {
        if (onLike) {
            onDislike(post.id);
        }
    }
    const handleComment = () => {
        if (onComment) {
            onComment(post.id);
        } else {
            Alert.alert("Comentario", "Se presionó comentar");
        }
    };

    const handleShare = () => {
        if (onShare) {
            onShare(post);
        } else {
            console.log("Compartir", post);

        }
    };


    // Al abrir el detalle del post
    const handleOpenDetail = () => {
        setSelectedPost(post);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.cardContainer}
                onPress={handleOpenDetail}
                activeOpacity={0.7}
            >
                <View style={styles.contentContainer}>

                    <View style={styles.content}>
                        <View style={styles.userDetailsContainer}>

                            <Image
                                source={{
                                    uri:
                                        post.userDetails?.avatar ||
                                        "https://www.pinkker.tv/uploads/imgs/assets/avatar_default/Fotoperfil1.png",
                                }}
                                style={styles.avatar}
                            />
                            <View style={styles.headerContainer}>
                                <Text
                                    style={styles.title}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {post.title}
                                </Text>

                                <Text style={styles.userName}>
                                    {post.userDetails?.nameUser || "Usuario Desconocido"}{" "}
                                    <Text style={styles.separator}>·</Text>{" "}
                                    <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
                                </Text>
                            </View>
                        </View>

                        <Text
                            numberOfLines={6}
                            ellipsizeMode="tail"
                            style={styles.description}>
                            {post.description}
                        </Text>
                        {post.Images?.length > 0 && (
                            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onLongPress={handleLongPressIn}
                                    onPressOut={handleLongPressOut}
                                >
                                    <Image source={{ uri: post.Images[0] }} style={styles.postImage} />
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                        {/* Sección de acciones */}
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.actionButton} onPress={post.userLiked ? handledisLike : handleLike}>
                                <Ionicons
                                    name={post.userLiked ? "heart" : "heart-outline"}
                                    size={20}
                                    color={styles.IconsColors.color}
                                />
                                <Text style={styles.actionText}>{post.likeCount}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                                <Ionicons name="chatbubble-outline" size={20} color={styles.IconsColors.color} />
                                <Text style={styles.actionText}>{post.commentCount}</Text>
                            </TouchableOpacity>
                            {/* compartir */}
                            {/* <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={20} color={styles.IconsColors.color}} />
                            </TouchableOpacity> */}
                            {/* NUEVO BOTÓN DE REPORTE */}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={openReportModal}
                            >
                                <Ionicons
                                    name="flag-outline"
                                    size={20}
                                    color={styles.IconsColors.color}
                                />
                            </TouchableOpacity>

                        </View>
                    </View>
                </View>
            </TouchableOpacity>
            {selectedPost && (
                <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedPost(null)}>
                    <PostDetailView post={selectedPost} onClose={() => setSelectedPost(null)} />
                </Modal>
            )}
            {/* Modal de imagen agrandada */}
            <Modal
                visible={reportModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.reportModal}>
                        <Text style={styles.modalTitle}>Reportar este post</Text>
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

            {post.Images?.length > 0 && (
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
                        <Image source={{ uri: post.Images[0] }} style={styles.enlargedImage} resizeMode="contain" />
                    </TouchableOpacity>
                </Modal>
            )}

        </>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        paddingVertical: 7,
        flexDirection: "row",
        width: "100%",
        alignItems: "center",
    },
    contentContainer: {
        flexDirection: "row",
        flex: 1,
    },
    headerContainer: {

    },
    avatar: {
        width: 36,
        height: 36,
        marginRight: 10,
        borderRadius: 100
    },
    content: {
        width: "90%",
    },
    userName: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: "condensed",

    },
    title: {
        fontSize: 18,
        fontWeight: "500",
        color: colors.textDark,
    },
    description: {
        fontSize: 13,
        color: colors.textDark,
        // marginBottom: 8,
        lineHeight: 20,
    },
    IconsColors: {
        color: colors.borderDark,
    },
    postImage: {
        width: "100%",
        height: 200,
        marginBottom: 10,
        borderRadius: 8,
    },
    actionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionText: {
        marginLeft: 4,
        fontSize: 12,
        color: colors.textGrey,
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
    likeIconContainer: {
        backgroundColor: "transparent",
    },
    liked: {
        backgroundColor: colors.gold, // Fondo amarillo
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

    separator: {
        marginHorizontal: 6,
        color: "#999", // o el color que quieras para el separador
        fontSize: 16,
    },
    date: {
        fontSize: 14,
        color: "#777",
    },
    userDetailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        // marginBottom: 10,


    },
});

export default PostCard;
