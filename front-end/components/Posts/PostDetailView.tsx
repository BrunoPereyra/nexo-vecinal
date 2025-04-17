import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/style/colors';
import { Post, addLike, addComment, getCommentsForPost, Dislike } from '@/services/posts';
import { useAuth } from '@/context/AuthContext';
import VisitedProfileModal from '../modalProfilevisited/VisitedProfileModa';
import CommentItem from "@/components/Posts/CommentItem"; // Importa el componente
import FullScreenImageModal from '../FullScreenImage/FullScreenImageModal';
import { createOrUpdateContentReport } from "@/services/reports";

interface PostDetailViewProps {
    post: Post;
    onClose: () => void;
}

const PostDetailView: React.FC<PostDetailViewProps> = ({ post, onClose }) => {
    const { token } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [likes, setLikes] = useState(post.likeCount);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsVisible, setCommentsVisible] = useState(false);
    // Estado para la imagen actual (índice)
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [showImageModal, setShowImageModal] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            if (!token) return;
            try {
                const data = await getCommentsForPost(post.id, token);
                if (data?.comments) {
                    setComments(data?.comments);
                } else {
                    setComments([]);

                }
            } catch (error) {
                console.error('Error fetching comments', error);
            }
        };
        fetchComments();
    }, [post.id, token]);
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

    const handleLike = async () => {
        if (!token) return;
        await addLike(post.id, token);
        setLikes(likes + 1);
        post.likeCount += 1;
        post.userLiked = true;
    };

    const handledislike = async () => {
        if (!token) return;
        try {
            await Dislike(post.id, token);
            setLikes(likes - 1);
            post.likeCount -= 1;
            post.userLiked = false;
        } catch (error) {
            console.error('Error adding like', error);
        }
    };

    const handleSendComment = async () => {
        if (!token || !commentText.trim()) return;
        try {
            const res = await addComment(post.id, { text: commentText.trim() }, token);
            console.log(res);

            if (res && res.message === 'Comment added') {
                setComments([res.comment, ...comments]);
                post.commentCount += 1;
                setCommentText('');
            } else {
                Alert.alert('Error', 'No se pudo agregar el comentario');
            }
        } catch (error) {
            console.error('Error adding comment', error);
            Alert.alert('Error', 'Error al agregar el comentario');
        }
    };

    // Funciones para navegar entre imágenes
    const goPrevImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    const goNextImage = () => {
        if (post.Images && currentImageIndex < post.Images.length - 1) {
            setCurrentImageIndex(currentImageIndex + 1);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={28} color={colors.textDark} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={styles.userContainer}
                onPress={() => setShowProfileModal(true)}
            >
                <View style={styles.avatarPlaceholder}>
                    {post.userDetails.avatar ? (
                        <Image source={{ uri: post.userDetails.avatar }} style={styles.avatar} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {post.userDetails.nameUser.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <Text style={styles.userName}>{post.userDetails.nameUser}</Text>
            </TouchableOpacity>
            <View style={styles.card}>
                <Text style={styles.title}>{post.title}</Text>
                <Text style={styles.description}>{post.description}</Text>
                {post.Images && post.Images.length > 0 && (
                    <View style={styles.imageContainer}>
                        {post.Images.length > 1 && (
                            <TouchableOpacity style={styles.navButtonLeft} onPress={goPrevImage}>
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            key={currentImageIndex}
                            onPress={() => {
                                setSelectedImage(post.Images[currentImageIndex]);
                                setShowImageModal(true);
                            }}
                            activeOpacity={0.8}
                        >

                            <Image source={{ uri: post.Images[currentImageIndex] }}
                                style={styles.postImage}
                                resizeMode="cover" />
                        </TouchableOpacity>
                        {post.Images.length > 1 && (
                            <TouchableOpacity style={styles.navButtonRight} onPress={goNextImage}>
                                <Ionicons name="chevron-forward" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                {/* Modal para mostrar la imagen completa */}
                {selectedImage && (
                    <FullScreenImageModal
                        visible={showImageModal}
                        uri={selectedImage}
                        onClose={() => setShowImageModal(false)}
                    />
                )}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={post.userLiked ? handledislike : handleLike}>
                        <Ionicons
                            name={post.userLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={colors.textDark}
                        />
                        <Text style={styles.actionText}>{post.likeCount}</Text>
                    </TouchableOpacity>
                    {/* compartir */}
                    {/* <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share-social-outline" size={20} color={colors.textDark} />
                    </TouchableOpacity> */}
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
            </View>
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
            <View style={styles.commentsContainer}>
                <View style={styles.commentsHeader}>
                    <Text style={styles.commentsTitle}>
                        Comentarios {post.commentCount}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setCommentsVisible(!commentsVisible)}
                        style={styles.iconButton}
                    >
                        <Ionicons
                            name={commentsVisible ? "chevron-up-outline" : "chevron-down-outline"}
                            size={24}
                            color={colors.textDark}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.commentInputContainer}>
                    <TextInput
                        placeholder="Agrega un comentario..."
                        placeholderTextColor="#888"
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        onSubmitEditing={handleSendComment}

                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendComment}>
                        <Ionicons name="send" size={20} color={colors.gold} />
                    </TouchableOpacity>
                </View>
                {commentsVisible && (
                    <>
                        {comments && comments.length > 0 ? (
                            comments.map((c) => <CommentItem key={c.id} comment={c} />)
                        ) : (
                            <Text style={styles.noCommentsText}>No hay comentarios aún.</Text>
                        )}
                    </>
                )}
            </View>
            <Modal
                visible={showProfileModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowProfileModal(false)}
            >
                <View style={styles.profileModalContainer}>
                    <VisitedProfileModal
                        visible={showProfileModal}
                        onClose={() => setShowProfileModal(false)}
                        userId={post.userDetails.id}
                    />
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: colors.background,
        flexGrow: 1,
    },
    header: {
        alignItems: "flex-end",
        marginBottom: 10,
    },
    userContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.cream,
        borderRadius: 8,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gold,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: colors.textDark,
        fontSize: 24,
        fontWeight: "bold",
    },
    userName: {
        fontSize: 18,
        color: colors.textDark,
        fontWeight: "bold",
    },
    card: {
        backgroundColor: colors.warmWhite,
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 20,
        lineHeight: 22,
    },
    imageContainer: {
        position: "relative",
        alignItems: "center",
    },
    postImage: {
        width: 300,
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    navButtonLeft: {
        position: "absolute",
        left: 10,
        top: "50%",
        transform: [{ translateY: -12 }],
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 6,
        borderRadius: 20,
        zIndex: 1,
    },
    navButtonRight: {
        position: "absolute",
        right: 10,
        top: "50%",
        transform: [{ translateY: -12 }],
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 6,
        borderRadius: 20,
        zIndex: 1,
    },
    actionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 14,
        color: colors.darkBackground,
    },
    commentsContainer: {
        marginTop: 20,
    },
    commentsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark,
    },
    iconButton: {
        padding: 6,
    },
    commentInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 8,
        padding: 8,
        backgroundColor: colors.warmWhite,
        color: colors.textDark,
    },
    sendButton: {
        marginLeft: 8,
        padding: 8,
        backgroundColor: colors.cream,
        borderRadius: 8,
    },
    profileModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    noCommentsText: {
        textAlign: "center",
        color: "#888",
        marginVertical: 10,
        fontSize: 14,
    },
    // report 
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
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
});

export default PostDetailView;
