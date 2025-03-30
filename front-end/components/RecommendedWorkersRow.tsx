import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { getRecommendedWorkers } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RecommendedWorker {
    id: string;
    userData: {
        id: string;
        nameUser: string;
        avatar?: string;
    };
}


const RecommendedWorkersRow = () => {
    const { token } = useAuth();
    const router = useRouter();
    const [workers, setWorkers] = useState<RecommendedWorker[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [page] = useState<number>(1); // Usamos la primera página

    useEffect(() => {
        const fetchRecommendedWorkers = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const cachedTags = await AsyncStorage.getItem("selectedTags");
                const parsedTags = cachedTags ? JSON.parse(cachedTags) : [];
                const data = await getRecommendedWorkers(page, token, parsedTags);

                if (data && data.workers) {
                    setWorkers(data.workers);
                } else {
                    const defaultWorkers = Array.from({ length: 10 }, (_, i) => ({
                        id: `default-${i + 1}`,
                        userData: {
                            id: `default-${i + 1}`,
                            nameUser: `User ${i + 1}`,
                            avatar: "https://www.pinkker.tv/uploads/imgs/assets/avatar_default/Fotoperfil1.png",
                        },
                    }));
                    const dt = { workers: defaultWorkers };
                    setWorkers(dt.workers);

                }
            } catch (error) {
                console.error("Error fetching recommended workers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendedWorkers();
    }, [token, page]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#03DAC5" />
            </View>
        );
    }

    // Si no se encontraron trabajadores, mostramos un mensaje
    if (!workers || workers.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron trabajadores recomendados</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {workers.map((worker) => (
                    <TouchableOpacity
                        key={worker.id}
                        style={styles.workerCard}
                        activeOpacity={0.7}
                        onPress={() =>
                            router.push(`/profile/ProfileVisited?id=${worker.userData.id}`)
                        }
                    >
                        {worker.userData.avatar ? (
                            <Image
                                source={{ uri: worker.userData.avatar }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {worker.userData.nameUser.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {/* <Text style={styles.workerName}>{worker.userData.nameUser}</Text> */}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

export default RecommendedWorkersRow;

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingHorizontal: 16,
    },
    title: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 6,
    },
    scrollContent: {
        paddingRight: 16,
    },
    workerCard: {
        marginRight: 8,
        alignItems: "center",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: "#03DAC5",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#0f2027",
        fontSize: 16,
        fontWeight: "bold",
    },
    workerName: {
        marginTop: 4,
        color: "#FFFFFF",
        fontSize: 10,
        maxWidth: 70,
        textAlign: "center",
    },
    loaderContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    emptyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: "center",
    },
    emptyText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontStyle: "italic",
    },
});
