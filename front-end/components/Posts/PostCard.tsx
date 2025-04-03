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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/style/colors";
import { Post } from "@/services/posts";
import PostDetailView from "./PostDetailView";

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

    // Valor animado para la escala de la imagen
    const scaleValue = new Animated.Value(1);
    // Estado para mostrar la imagen en grande en un modal
    const [enlargedVisible, setEnlargedVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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
            Alert.alert("Compartir", "Se presionó compartir");
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
                    <Image
                        source={{
                            uri:
                                post.userDetails?.avatar ||
                                "https://www.pinkker.tv/uploads/imgs/assets/avatar_default/Fotoperfil1.png",
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.content}>
                        <View style={styles.headerContainer}>
                            <Text style={styles.userName}>
                                {post.userDetails?.nameUser || "Usuario Desconocido"}
                            </Text>
                        </View>
                        <Text style={styles.title}>{post.title}</Text>
                        <Text style={styles.description}>
                            {truncateDescription(post.description, 100)}
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
                                    color={colors.gold}
                                />
                                <Text style={styles.actionText}>{post.likeCount}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                                <Ionicons name="chatbubble-outline" size={20} color={colors.gold} />
                                <Text style={styles.actionText}>{post.commentCount}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={20} color={colors.gold} />
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
        paddingRight: 10,
        flexDirection: "row",
        borderRadius: 0,
        shadowOpacity: 0,
        elevation: 0,
    },
    contentContainer: {
        flexDirection: "row",
        flex: 1,
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 7,
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
        fontWeight: "bold",
    },
    title: {
        fontSize: 19,
        fontWeight: "bold",
        color: colors.textDark,
    },
    description: {
        fontSize: 14,
        color: colors.textDark,
        lineHeight: 20,
        marginBottom: 8,
    },
    postImage: {
        width: "100%",
        height: 200,
        marginBottom: 10,
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
        color: colors.gold,
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
});

export default PostCard;
