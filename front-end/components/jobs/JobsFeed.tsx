import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Animated,
    FlatList,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Text,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Easing,
    ActivityIndicator, // Importar el ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getJobsByFilters, Job } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import JobCard from "@/components/JobCardHome";
import JobSearchFilters, { FilterParams } from "@/components/jobCards/JobSearchFilters";
import JobDetailView from "@/components/jobCards/JobDetailView";
import RecommendedWorkersRow from "@/components/RecommendedWorkersRow";
import colors from "@/style/colors";
import { Ionicons } from "@expo/vector-icons";

const HEADER_HEIGHT = 50;

const JobsFeed: React.FC = () => {
    const { token } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [filterParams, setFilterParams] = useState<FilterParams>({
        searchTitle: "",
        selectedTags: [],
        location: { latitude: -31.4201, longitude: -64.1888 },
        radius: 10,
    });
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isFirstLoadComplete, setIsFirstLoadComplete] = useState(false);
    const [showRecommended, setShowRecommended] = useState<boolean>(false);

    const flatListRef = useRef<FlatList<any>>(null);

    // Valores animados para el header
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

    // Función para solicitar los trabajos
    const fetchJobs = async (pageNumber: number, append: boolean = false) => {
        console.log("AQUI", filterParams.searchTitle);
        if (!token || !filterParams.location) return;
        const apiFilters = {
            tags: filterParams.selectedTags,
            longitude: filterParams.location.longitude,
            latitude: filterParams.location.latitude,
            radius: filterParams.radius,
            title: filterParams.searchTitle.trim(),
        };
        try {
            const data = await getJobsByFilters(apiFilters, token, pageNumber);
            // Si la cantidad de resultados es menor al esperado, asumimos que ya no hay más.
            if (data.length < 1) {
                setHasMore(false);
            }
            if (append) {
                setJobs((prevJobs) => {
                    const newJobs = data.filter(
                        (job: Job) => !prevJobs.some((existingJob) => existingJob.id === job.id)
                    );
                    return [...prevJobs, ...newJobs];
                });
            } else {
                setJobs(data);
            }
        } catch (error) {
            console.error("Error fetching jobs:", error);
        }
    };

    // Función para el botón de búsqueda o filtros
    const handleSearch = async (filters: FilterParams) => {
        setFilterParams(filters);
        setPage(1);
        setHasMore(true);
        await fetchJobs(1, false);
        setIsFirstLoadComplete(true);
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    };

    // Cargar filtros guardados y búsqueda inicial
    useEffect(() => {
        const loadSavedFilters = async () => {
            try {
                const cachedTitle = await AsyncStorage.getItem("searchTitle");
                const cachedTags = await AsyncStorage.getItem("selectedTags");
                const cachedLocation = await AsyncStorage.getItem("location");
                const cachedRadius = await AsyncStorage.getItem("radius");

                const parsedTags = cachedTags ? JSON.parse(cachedTags) : [];
                const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
                const parsedRadius = cachedRadius ? JSON.parse(cachedRadius) : null;

                const filters: FilterParams = {
                    searchTitle: cachedTitle || "",
                    selectedTags: parsedTags,
                    location: parsedLocation || { latitude: -31.4201, longitude: -64.1888 },
                    radius: parsedRadius || 10,
                };
                setFilterParams(filters);
                await handleSearch(filters);
            } catch (error) {
                console.error("Error cargando los filtros guardados:", error);
            }
        };
        loadSavedFilters();
    }, [token]);

    // Función que se dispara cuando se llega al final del FlatList
    const handleLoadMore = async () => {
        if (!isFirstLoadComplete) return;
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        // Retardo de 1 segundo antes de solicitar más trabajos
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const nextPage = page + 1;
        await fetchJobs(nextPage, true);
        setPage(nextPage);
        setLoadingMore(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <Animated.View
                style={[
                    styles.headerContainer,
                    { transform: [{ translateY: headerTranslateY }], opacity: headerOpacity },
                ]}
            >
                <View style={styles.filterContainer}>
                    <JobSearchFilters onSearch={handleSearch} />
                </View>
                <View style={styles.recommendedHeader}>
                    <Text style={styles.recommendedHeaderText}>Trabajadores recomendados</Text>
                    <TouchableOpacity
                        onPress={() => setShowRecommended(!showRecommended)}
                        style={styles.iconButton}
                    >
                        <Ionicons
                            name={showRecommended ? "chevron-up-outline" : "chevron-down-outline"}
                            size={24}
                            color={colors.textDark}
                        />
                    </TouchableOpacity>
                </View>
                {showRecommended && <RecommendedWorkersRow />}
            </Animated.View>
            <Animated.FlatList
                ref={flatListRef}
                data={jobs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <JobCard job={item} onPress={() => setSelectedJob(item)} />
                )}
                contentContainerStyle={[styles.listContainer, { paddingTop: HEADER_HEIGHT + 16 }]}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={{ color: colors.textDark, marginTop: 4, fontSize: 12 }}>Cargando más trabajos...</Text>
                        </View>
                    ) : null
                }
            />
            <Modal visible={!!selectedJob} animationType="slide">
                {selectedJob && (
                    <JobDetailView job={selectedJob} onClose={() => setSelectedJob(null)} />
                )}
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.warmWhite,
        zIndex: 10,
    },
    filterContainer: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },
    recommendedHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.cream,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },
    recommendedHeaderText: {
        color: colors.textDark,
        fontSize: 16,
        fontWeight: "bold",
    },
    iconButton: {
        padding: 6,
    },
    listContainer: {
        top: "10%",
        padding: 16,
        paddingBottom: 16,
    },
    footer: {
        paddingVertical: 70,
        alignItems: "center",
    },
});

export default JobsFeed;
