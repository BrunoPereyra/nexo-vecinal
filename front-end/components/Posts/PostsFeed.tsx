import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Animated,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Easing,
    Modal,
    TextInput,
    Text,
    TouchableWithoutFeedback
} from "react-native";
import { getLatestPosts, Post, addLike, addComment, Dislike } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import PostCard from "@/components/Posts/PostCard";
import CreatePost from "@/components/Posts/CreatePost";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/style/colors";

const HEADER_HEIGHT = 50;

const PostsFeed: React.FC = () => {
    const { token } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentText, setCommentText] = useState("");

    const flatListRef = useRef<FlatList<any>>(null);
    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const lastOffset = useRef(0);

    useEffect(() => {
        loadPosts(1);
    }, [token]);

    const loadPosts = async (pageNumber: number) => {
        console.log("pageNumber", pageNumber);

        if (!token) return;
        setLoading(true);
        try {
            const data = await getLatestPosts(token, pageNumber, limit);

            if (data && data.length < limit) {
                setHasMore(false);
            }
            if (pageNumber === 1) {
                setPosts(data || []);
            } else {
                setPosts((prevPosts) => [...prevPosts, ...(data || [])]);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadPosts(nextPage);
        }
    };
    const closeModal = () => {
        setShowCommentModal(false);
        setCommentText(""); // Limpiar el input al cerrar
    };

    const handleLike = async (postId: string) => {
        if (!token) return;
        await addLike(postId, token);

        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId ? { ...post, userLiked: true, likeCount: post.likeCount + 1 } : post
            )
        );

    };
    const handledislike = async (postId: string) => {
        if (!token) return;
        await Dislike(postId, token);
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId ? { ...post, userLiked: false, likeCount: post.likeCount - 1 } : post
            )
        );
    }

    const handleComment = (post: Post) => {
        setSelectedPost(post);
        setShowCommentModal(true);
    };

    const sendComment = async () => {
        if (!token || !selectedPost || !commentText.trim()) return;
        try {
            const res = await addComment(selectedPost.id, { text: commentText.trim() }, token);
            if (res && res.message === "Comment added") {
                setCommentText("");
                setShowCommentModal(false);
            }
        } catch (error) {
            console.error("Error adding comment", error);
        }
    };

    return (
        <View style={{ flex: 1, }}>
            <Animated.FlatList
                ref={flatListRef}
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLike={() => handleLike(item.id)}
                        onDislike={() => handledislike(item.id)}
                        onComment={() => handleComment(item)}
                    />
                )}
                contentContainerStyle={[styles.listContainer,]}
                scrollEventThrottle={16}
                onScroll={(event) => {
                    const currentOffset = event.nativeEvent.contentOffset.y;
                    const diff = currentOffset - lastOffset.current;
                    if (Math.abs(diff) < 30) return;
                    if (diff > 0) {
                        Animated.parallel([
                            Animated.timing(headerTranslateY, {
                                toValue: -HEADER_HEIGHT,
                                duration: 50,
                                easing: Easing.out(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(headerOpacity, {
                                toValue: 0,
                                duration: 50,
                                easing: Easing.out(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ]).start();
                    } else if (diff < -10) {
                        Animated.parallel([
                            Animated.timing(headerTranslateY, {
                                toValue: 0,
                                duration: 150,
                                easing: Easing.out(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(headerOpacity, {
                                toValue: 1,
                                duration: 150,
                                easing: Easing.out(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ]).start();
                    }
                    lastOffset.current = currentOffset;
                }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
            />

            {/* Modal para comentar */}
            <Modal visible={showCommentModal} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.commentModalOverlay}>
                        <View style={styles.commentModalContent}>
                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Ionicons name="close" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Agregar comentario</Text>
                            <View style={styles.commentInputContainer}>
                                <TextInput
                                    placeholder="Agrega un comentario..."
                                    placeholderTextColor="#888"
                                    style={styles.commentInput}
                                    value={commentText}
                                    onChangeText={setCommentText}
                                />
                                <TouchableOpacity style={styles.sendButton} onPress={sendComment}>
                                    <Ionicons name="send" size={20} color={colors.gold} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>

            </Modal>
            <TouchableOpacity
                style={styles.fabButton}
                onPress={() => setShowCreatePostModal(true)}
            >
                <Ionicons name="add" size={30} color={colors.textDark} />
            </TouchableOpacity>
            <CreatePost
                visible={showCreatePostModal}
                onClose={() => setShowCreatePostModal(false)}
                onPostCreated={(newPost) => {
                    setPosts([newPost, ...posts]);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 13,
        paddingBottom: 16,
    },
    commentModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        right: 10,
        top: 10,
        padding: 5,
    },
    commentModalContent: {
        width: "90%",
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },

    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
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
    fabButton: {
        position: "absolute",
        bottom: 50,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.warmWhite,
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});

export default PostsFeed;
