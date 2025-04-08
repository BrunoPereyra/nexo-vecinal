import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";

// Importa las funciones de tus servicios
import { getFilteredUsers, ReqLocationTags } from "@/services/userService";
import { getRecommendedWorkers } from "@/services/JobsService";
import colors from '@/style/colors';

export interface RecommendedWorker {
    id: string;
    userData: {
        id: string;
        nameUser: string;
        avatar?: string;
    };
}

const RecommendedWorkersRow: React.FC = () => {
    const { token, tags: availableTags } = useAuth();
    const router = useRouter();
    const [workers, setWorkers] = useState<RecommendedWorker[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [page] = useState<number>(1); // Usamos la primera página

    useEffect(() => {
        const fetchWorkers = async () => {
            if (!token) return;
            setLoading(true);
            try {
                // Obtener filtros guardados (tags, ubicación y radio)
                const cachedTags = await AsyncStorage.getItem('selectedTags');
                const cachedLocation = await AsyncStorage.getItem('location');
                const cachedRadius = await AsyncStorage.getItem('radius');
                const parsedTags = cachedTags ? JSON.parse(cachedTags) : [];
                const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
                // Para este ejemplo usamos el valor del radio guardado como "ratio"
                const ratio = cachedRadius ? Number(cachedRadius) : 5000;

                const filterReq: ReqLocationTags = {
                    location: parsedLocation,
                    ratio: ratio,
                    tags: parsedTags,
                };

                // Primero intentamos obtener usuarios filtrados
                const filteredData = await getFilteredUsers(filterReq, token);
                if (filteredData && filteredData.users && filteredData.users.length > 0) {
                    setWorkers(filteredData.users);
                } else {
                    // Si no hay usuarios filtrados, se solicita la recomendación
                    const recommendedData = await getRecommendedWorkers(page, token, parsedTags);
                    if (recommendedData && recommendedData.workers) {
                        setWorkers(recommendedData.workers);
                    } else {
                        setWorkers([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching recommended workers:", error);
                Alert.alert("Error", "No se pudieron obtener los trabajadores recomendados");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkers();
    }, [token, page]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#03DAC5" />
            </View>
        );
    }

    if (!workers || workers.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron trabajadores recomendados</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
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
        color: colors.background,
        fontSize: 14,
        fontStyle: "italic",
    },
});
