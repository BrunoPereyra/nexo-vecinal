import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Animated,
    Easing,
    Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Job, recommendedJobs } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import JobCard from "@/components/JobCardHome";
import JobDetailView from "@/components/jobCards/JobDetailView";
import JobRecommendationsLocation from "../preference/JobRecommendationsLocation";
import colors from "@/style/colors";

const HEADER_HEIGHT = 50;

const RecommendedJobsFeed: React.FC = () => {
    const { token } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);

    const flatListRef = useRef<FlatList<any>>(null);
    const [locationConfigured, setLocationConfigured] = useState(false);

    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const lastOffset = useRef(0);

    const handleScroll = (event: any) => {
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

    const fetchRecommendedJobs = async (pageNumber: number, append = false) => {
        if (!token || !locationConfigured) return;
        const data = await recommendedJobs(token, pageNumber.toString());
        if (!data) return;
        const jobs = data.jobs || [];
        if (jobs.length === 0) {
            setHasMore(false);
            if (append) {
                setLoadingMore(false);
            }
            return;
        }

        if (append) {
            setJobs((prev) => {
                const newJobs = jobs.filter(
                    (job: Job) => !prev.some((j) => j.id === job.id)
                );
                return [...prev, ...newJobs];
            });
        } else {
            setJobs(jobs);
        }
    };
    useEffect(() => {
        if (locationConfigured) {
            fetchRecommendedJobs(1); // Cargar la primera página al configurar la ubicación
        }
    }, [locationConfigured]);

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        await fetchRecommendedJobs(nextPage, true);
        setPage(nextPage); // Actualizar la página solo después de cargar los datos
        setLoadingMore(false);
    };
    const checkLocationPreference = async () => {
        const savedLocation = await AsyncStorage.getItem("jobRecommendationsLocation");
        if (savedLocation) {
            setLocationConfigured(true);
        }
    };

    useEffect(() => {
        checkLocationPreference();
    }, [token]);

    return (
        <View style={styles.RecommendedJobsFeed}>
            {/* Botón para modificar preferencias */}
            {/* <View style={styles.header}>
                <TouchableOpacity
                    style={styles.preferencesButton}
                    onPress={() => setShowPreferencesModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="options-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View> */}
            {locationConfigured ? (
                jobs.length > 0 ? (
                    <Animated.FlatList
                        ref={flatListRef}
                        data={jobs}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <JobCard job={item} onPress={() => setSelectedJob(item)} />
                        )}
                        contentContainerStyle={[styles.listContainer]}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={styles.footer}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.loadingText}>Cargando más trabajos...</Text>
                                </View>
                            ) : null
                        }
                    />
                ) : (
                    <View style={styles.noJobsContainer}>
                        <Text style={styles.noJobsText}>
                            Aquí se mostrarán los trabajos disponibles que coincidan con tu zona de trabajo y habilidades.
                        </Text>
                    </View>
                )
            ) : (
                <JobRecommendationsLocation
                    onSave={() => {
                        setLocationConfigured(true);
                        fetchRecommendedJobs(1);
                    }}
                    onClose={() => setShowPreferencesModal(false)}
                />
            )}
            {/* Modal para modificar preferencias */}
            <Modal visible={showPreferencesModal} animationType="slide">
                <JobRecommendationsLocation
                    onSave={() => {
                        setShowPreferencesModal(false);
                        fetchRecommendedJobs(1);
                    }}
                    onClose={() => setShowPreferencesModal(false)} // Permitir cerrar el modal sin guardar
                />
            </Modal>

            <Modal visible={!!selectedJob} animationType="slide">
                {selectedJob && (
                    <JobDetailView job={selectedJob} onClose={() => setSelectedJob(null)} />
                )}
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    RecommendedJobsFeed: {
        flex: 1,
        top: 0,
    },
    header: {
        height: HEADER_HEIGHT,
        justifyContent: "center",
        alignItems: "flex-start", // Posicionar el botón a la derecha
        paddingHorizontal: 16,
        backgroundColor: colors.background, // Fondo consistente con el diseño
    },
    preferencesButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.cream,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 2,
    },
    preferencesButtonText: {
        color: colors.textLight,
        fontWeight: "bold",
        fontSize: 16,
        textAlign: "center",
    },
    listContainer: {
        padding: 13,
        paddingBottom: 16,
        width: "85%",
        top: -10,
    },
    footer: {
        paddingVertical: 70,
        alignItems: "center",
    },
    loadingText: {
        color: colors.textDark,
        marginTop: 4,
        fontSize: 12,
    },
    noJobsContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    noJobsText: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: "center",
    },
});

export default RecommendedJobsFeed;