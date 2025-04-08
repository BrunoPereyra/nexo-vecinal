import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    Button,
    ScrollView,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { GetJobDetailvisited, } from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackSection } from '@/components/FeedbackSection';
import ErrorBoundary from '@/components/ErrorBoundary';
import colors from '@/style/colors';

export default function JobDetailVisited() {
    // Obtenemos el parámetro "id" de la URL
    const { id: jobId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('id').then((id) => setCurrentUserId(id));
    }, []);
    const [jobDetail, setJobDetail] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    useEffect(() => {
        const fetchJobDetail = async () => {
            if (!jobId || !token) return;
            setLoading(true);
            try {
                const data = await GetJobDetailvisited(jobId);

                if (data.job) {
                    setJobDetail(data.job);
                }
            } catch (err) {
                setError('Error al obtener el detalle del trabajo');
            } finally {
                setLoading(false);
            }
        };
        fetchJobDetail();
    }, [jobId, token]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.background} />
            </View>
        );
    }

    if (error) {
        if (!jobDetail) {
            return (
                <View style={styles.center}>
                    <Text style={styles.errorText}>No se encontró el detalle del trabajo</Text>
                </View>
            );
        }

    }

    // Aseguramos que applicants sea un array
    const applicants = jobDetail?.applicants || [];
    const assignedCandidate = jobDetail?.assignedCandidate || null;
    const otherApplicants = assignedCandidate
        ? applicants.filter((applicant: any) => applicant.id !== assignedCandidate?.id)
        : applicants;

    if (jobDetail) {
        return (<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Información principal del trabajo */}
            <Text style={styles.title}>{jobDetail.title}</Text>
            <Text style={styles.description}>{jobDetail.description}</Text>
            <Text style={styles.detail}>Precio: ${jobDetail.budget}</Text>
            <Text style={styles.detail}>Estado: {jobDetail.status}</Text>
            {assignedCandidate && (
                <Text style={styles.detail}>
                    Asignado a: {assignedCandidate.nameUser}
                </Text>
            )}

            {jobDetail.location && jobDetail.location.coordinates && (
                <View style={styles.mapContainer}>
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


            {/* Sección de postulados */}
            {/* < job={jobDetail} token={token as string} /> */}

            {/* Sección de feedback: mostramos ambos feedbacks sin condición */}

            <FeedbackSection
                jobDetail={jobDetail}
                currentUserId={currentUserId || ''}
                rating={0}
                feedback={"feedback"}
                actionLoading={false}
                setRating={() => { }}
                setFeedback={() => { }}
                handleLeaveFeedback={() => { }}
                mode="employer"
            />
        </ScrollView>)
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: colors.background, // "#FFFFFF"
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
        color: colors.textDark, // "#333"
    },
    description: {
        fontSize: 16,
        marginBottom: 8,
        color: colors.textDark,
    },
    detail: {
        fontSize: 16,
        marginBottom: 4,
        color: colors.textDark,
    },
    mapContainer: {
        height: 200,
        width: "100%",
        marginVertical: 16,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: colors.cream, // "#FFF8DC"
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    map: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginVertical: 8,
        color: colors.primary, // "#03DAC5"
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    ratingLabel: {
        fontSize: 16,
        marginRight: 8,
        color: colors.textDark,
    },
    star: {
        fontSize: 24,
        marginHorizontal: 2,
    },
    selectedStar: {
        color: colors.primary,
    },
    unselectedStar: {
        color: colors.borderLight,
    },
    feedbackContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: colors.cream,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    feedbackInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 5,
        padding: 8,
        minHeight: 60,
        marginBottom: 10,
        backgroundColor: colors.background,
        color: colors.textDark,
    },
    feedbackButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    feedbackButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.textDark,
    },
    existingFeedbackContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: colors.cream,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: 16,
    },
    feedbackTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
        color: colors.primary,
    },
    feedbackText: {
        fontSize: 16,
        marginBottom: 4,
        color: colors.textDark,
    },
    candidateCard: {
        padding: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.cream,
    },
    candidateName: {
        fontSize: 16,
        color: colors.textDark,
    },
    assignedCandidateCard: {
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 4,
        marginBottom: 8,
        backgroundColor: colors.cream,
    },
    completeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 16,
        alignItems: "center",
    },
    completeButtonText: {
        color: colors.textDark,
        fontWeight: "bold",
        fontSize: 16,
    },
    errorText: {
        color: colors.errorRed,
        marginBottom: 16,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
    },
});
