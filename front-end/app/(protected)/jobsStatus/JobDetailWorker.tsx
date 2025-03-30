import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GetJobDetailvisited, provideWorkerFeedback } from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackSection } from '@/components/FeedbackSection';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import ErrorBoundary from '@/components/ErrorBoundary';
import colors from '@/style/colors';

export default function JobDetailWorker() {
    // Obtenemos el parámetro "id" de la URL
    const { id: jobId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();

    const [jobDetail, setJobDetail] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<boolean>(false);

    // Estados para feedback y rating (trabajador)
    const [feedback, setFeedback] = useState<string>('');
    const [rating, setRating] = useState<number>(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (!jobId) {
            router.push(
                `/(protected)/jobsStatus/jobs`
            )
        }
        AsyncStorage.getItem('id').then((id) => setCurrentUserId(id));
    }, []);

    useEffect(() => {
        const fetchJobDetail = async () => {
            if (!jobId) return;
            setLoading(true);
            try {
                const data = await GetJobDetailvisited(jobId);
                if (data.job) {
                    setJobDetail(data.job);
                } else {
                    setError('No se encontró el detalle del trabajo');
                }
            } catch (err) {
                setError('Error al obtener el detalle del trabajo');
            } finally {
                setLoading(false);
            }
        };
        fetchJobDetail();
    }, [jobId]);

    const handleLeaveFeedback = async () => {
        if (!feedback.trim() || rating === 0 || !jobDetail || !token) {
            alert('El feedback y la calificación no pueden estar vacíos');
            return;
        }
        setActionLoading(true);
        try {
            const feedbackData = { comment: feedback.trim(), rating };
            const res = await provideWorkerFeedback(jobDetail.id, feedbackData, token);
            if (res && res.message === "Worker feedback provided successfully") {
                alert('Feedback enviado exitosamente');
                setJobDetail({ ...jobDetail, workerFeedback: res.feedback });
                setFeedback('');
                setRating(0);
            } else {
                alert('No se pudo enviar el feedback');
            }
        } catch (error) {
            console.error('Error al enviar feedback:', error);
            alert('Ocurrió un error al enviar el feedback');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    if (error || !jobDetail) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    {error || 'No se encontró el detalle del trabajo'}
                </Text>
            </View>
        );
    }

    const { userDetails } = jobDetail;

    return (
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Card del Empleador */}
                {userDetails && (
                    <TouchableOpacity style={styles.employerCard} activeOpacity={0.7}>
                        <View style={styles.avatarWrapper}>
                            {userDetails.avatar ? (
                                <Image source={{ uri: userDetails.avatar }} style={styles.employerAvatar} />
                            ) : (
                                <Text style={styles.avatarPlaceholderText}>
                                    {userDetails.nameUser.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={styles.employerName}>{userDetails.nameUser}</Text>
                    </TouchableOpacity>
                )}

                {/* Card de Detalle del Trabajo */}
                <View style={styles.jobCard}>
                    <Text style={styles.jobTitle}>{jobDetail.title}</Text>
                    <Text style={styles.jobDescription}>{jobDetail.description}</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Precio:</Text>
                        <Text style={styles.detailValue}>
                            ${jobDetail.budget || jobDetail.price}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Estado:</Text>
                        <Text style={styles.detailValue}>{jobDetail.status}</Text>
                    </View>
                    {jobDetail.assignedCandidate && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Asignado a:</Text>
                            <Text style={styles.detailValue}>{jobDetail.assignedCandidate.nameUser}</Text>
                        </View>
                    )}
                </View>

                {/* Mapa con la ubicación del trabajo */}
                {jobDetail.location && jobDetail.location.coordinates && (
                    <View style={styles.mapCard}>
                        <ErrorBoundary>
                            <MapView
                                style={styles.map}
                                initialRegion={{
                                    latitude: jobDetail.location.coordinates[1],
                                    longitude: jobDetail.location.coordinates[0],
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                onMapReady={() => {
                                    setIsMapReady(true);
                                }}
                            >
                                {isMapReady && (
                                    <Marker
                                        coordinate={{
                                            latitude: jobDetail.location.coordinates[1],
                                            longitude: jobDetail.location.coordinates[0],
                                        }}
                                        title={jobDetail.title}
                                        description={jobDetail.description}
                                    />
                                )}
                            </MapView>
                        </ErrorBoundary>
                    </View>
                )}

                {/* Sección de Feedback */}
                <FeedbackSection
                    jobDetail={jobDetail}
                    currentUserId={currentUserId || ''}
                    rating={rating}
                    feedback={feedback}
                    actionLoading={actionLoading}
                    setRating={setRating}
                    setFeedback={setFeedback}
                    handleLeaveFeedback={handleLeaveFeedback}
                    mode="worker"
                />
            </ScrollView>

            {/* Botón flotante para abrir el chat */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    router.push(
                        `/(protected)/(chat)/ChatScreen?jobId=${jobDetail.id}&employerProfile=${encodeURIComponent(
                            JSON.stringify(jobDetail.userDetails)
                        )}&origin=jobstatus`
                    )
                }
            >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#121212" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // "#FFFFFF"
    },
    contentContainer: {
        padding: 6,
        paddingBottom: 30,
        backgroundColor: colors.warmWhite, // "#FAF9F6"
    },
    center: {
        flex: 1,
        backgroundColor: colors.warmWhite,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: colors.errorRed, // "#CF6679"
        marginBottom: 20,
        fontSize: 16,
    },
    // Card del Empleador
    employerCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.cream, // "#FFF8DC"
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.warmWhite, // "#03DAC5"
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    employerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholderText: {
        color: colors.textDark, // "#333"
        fontSize: 24,
        fontWeight: "bold",
    },
    employerName: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
    },
    // Card de Detalle del Trabajo
    jobCard: {
        backgroundColor: colors.cream, // "#FFF8DC"
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    jobTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        marginBottom: 8,
    },
    jobDescription: {
        fontSize: 16,
        color: colors.textMuted, // "#888"
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textDark, // "#03DAC5"
        marginRight: 8,
    },
    detailValue: {
        fontSize: 16,
        color: colors.textDark, // "#333"
    },
    // Mapa
    mapCard: {
        height: 200,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    map: {
        flex: 1,
    },
    // Botón flotante de Chat
    fab: {
        position: "absolute",
        bottom: 100,
        right: 20,
        backgroundColor: colors.gold,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.borderLight,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
});

