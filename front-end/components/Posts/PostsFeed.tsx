import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Animated,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Easing,
} from "react-native";
import { getLatestPosts, Post } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import PostCard from "@/components/Posts/PostCard";
import CreatePost from "@/components/Posts/CreatePost";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/style/colors";

const HEADER_HEIGHT = 50;

const PostsFeed: React.FC = () => {
    const { token } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);

    const flatListRef = useRef<FlatList<any>>(null);
    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const lastOffset = useRef(0);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    };

    const loadPosts = async () => {
        if (!token) return;
        try {
            const data = await getLatestPosts(token);
            setPosts(data || []);
        } catch (error) {
            console.error("Error fetching posts:", error);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [token]);

    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <Animated.FlatList
                ref={flatListRef}
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <PostCard post={item} onPress={() => setSelectedPost(item)} />
                )}
                contentContainerStyle={[styles.listContainer, { paddingTop: 16 }]}
                scrollEventThrottle={16}
                onScroll={handleScroll}
            />

            {/* Botón flotante para crear post */}
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
        padding: 16,
        paddingBottom: 80, // Espacio para el FAB
    },
    fabButton: {
        position: "absolute",
        bottom: 100,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gold,
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
