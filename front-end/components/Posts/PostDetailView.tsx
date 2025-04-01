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
import { Post, addLike, addComment, getCommentsForPost } from '@/services/posts';
import { useAuth } from '@/context/AuthContext';
import VisitedProfileModal from '../modalProfilevisited/VisitedProfileModa';
import CommentItem from "@/components/Posts/CommentItem"; // Importa el componente

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

    useEffect(() => {
        const fetchComments = async () => {
            if (!token) return;
            try {
                const data = await getCommentsForPost(post.id, token);
                console.log("Comentarios recibidos:", JSON.stringify(data, null, 2));
                if (data) {
                    setComments(data?.comments); // Se asume que el backend devuelve { comments: [...] }
                }
            } catch (error) {
                console.error('Error fetching comments', error);
            }
        };
        fetchComments();
    }, [post.id, token]);

    const handleLike = async () => {
        if (!token) return;
        try {
            const res = await addLike(post.id, token);
            if (!res && (res.message !== 'Like added' || res.message == "Already read")) {
                return
            } else {
                setLikes(likes + 1);
            }
        } catch (error) {
            console.error('Error adding like', error);
            return

        }
    };

    const handleSendComment = async () => {
        if (!token) return;
        if (!commentText.trim()) return;

        try {
            const res = await addComment(post.id, { text: commentText.trim() }, token);
            if (res && res.message === 'Comment added') {
                setComments([res.comment, ...comments]);
                post.commentCount += 1
                setCommentText('');
            } else {
                Alert.alert('Error', 'No se pudo agregar el comentario');
            }
        } catch (error) {
            console.error('Error adding comment', error);
            Alert.alert('Error', 'Error al agregar el comentario');
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
                {post.Images?.length > 0 && (
                    <Image source={{ uri: post.Images[0] }} style={styles.postImage} />
                )}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                        <Ionicons name="heart-outline" size={20} color={colors.gold} />
                        <Text style={styles.actionText}>{likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share-social-outline" size={20} color={colors.gold} />
                    </TouchableOpacity>
                </View>
            </View>
            {/* Sección de comentarios con botón toggle */}
            <View style={styles.commentsContainer}>
                <View style={styles.commentsHeader}>
                    <Text style={styles.commentsTitle}>
                        Comentarios ({post.commentCount})
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
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendComment}>
                        <Ionicons name="send" size={20} color={colors.gold} />
                    </TouchableOpacity>
                </View>
                {commentsVisible && (
                    <>
                        {comments.map((c) => (
                            <CommentItem key={c.id} comment={c} />
                        ))}

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
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 18,
        color: colors.textDark,
        fontWeight: 'bold',
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
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: colors.textMuted,
        marginBottom: 20,
        lineHeight: 22,
    },
    postImage: {
        width: '100%',
        height: 200,
        marginBottom: 10,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 14,
        color: colors.gold,
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
        flexDirection: 'row',
        alignItems: 'center',
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
});

export default PostDetailView;
