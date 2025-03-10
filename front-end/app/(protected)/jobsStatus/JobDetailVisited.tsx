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
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { GetJobDetailvisited, GetJobTokenAdmin } from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackSection } from '@/components/FeedbackSection';

export default function JobDetailVisited() {
    // Obtenemos el parámetro "id" de la URL
    const { id: jobId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
            <View style={darkStyles.center}>
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    if (error) {
        if (!jobDetail) {
            return (
                <View style={darkStyles.center}>
                    <Text style={darkStyles.errorText}>No se encontró el detalle del trabajo</Text>
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
        return (<ScrollView style={darkStyles.container} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Información principal del trabajo */}
            <Text style={darkStyles.title}>{jobDetail.title}</Text>
            <Text style={darkStyles.description}>{jobDetail.description}</Text>
            <Text style={darkStyles.detail}>Precio: ${jobDetail.budget}</Text>
            <Text style={darkStyles.detail}>Estado: {jobDetail.status}</Text>
            {assignedCandidate && (
                <Text style={darkStyles.detail}>
                    Asignado a: {assignedCandidate.nameUser}
                </Text>
            )}

            {/* Mapa para mostrar la ubicación */}
            {jobDetail.location && jobDetail.location.coordinates && (
                <View style={darkStyles.mapContainer}>
                    <MapView
                        style={darkStyles.map}
                        initialRegion={{
                            latitude: jobDetail.location.coordinates[1],
                            longitude: jobDetail.location.coordinates[0],
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Marker
                            coordinate={{
                                latitude: jobDetail.location.coordinates[1],
                                longitude: jobDetail.location.coordinates[0],
                            }}
                            title={jobDetail.title}
                            description={jobDetail.description}
                        />
                    </MapView>
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

const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#121212'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#E0E0E0'
    },
    description: {
        fontSize: 16,
        marginBottom: 8,
        color: '#E0E0E0'
    },
    detail: {
        fontSize: 16,
        marginBottom: 4,
        color: '#E0E0E0'
    },
    mapContainer: {
        height: 200,
        width: '100%',
        marginVertical: 16,
        borderRadius: 8,
        overflow: 'hidden'
    },
    map: {
        flex: 1
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 8,
        color: '#BB86FC'
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    ratingLabel: {
        fontSize: 16,
        marginRight: 8,
        color: '#E0E0E0'
    },
    star: {
        fontSize: 24,
        marginHorizontal: 2
    },
    selectedStar: {
        color: '#F1C40F'
    },
    unselectedStar: {
        color: '#444'
    },
    feedbackContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8
    },
    feedbackInput: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 5,
        padding: 8,
        minHeight: 60,
        marginBottom: 10,
        backgroundColor: '#121212',
        color: '#E0E0E0'
    },
    feedbackButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center'
    },
    feedbackButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16
    },
    existingFeedbackContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#121212',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#BB86FC',
        marginBottom: 16
    },
    feedbackTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#BB86FC'
    },
    feedbackText: {
        fontSize: 16,
        marginBottom: 4,
        color: '#E0E0E0'
    },
    candidateCard: {
        padding: 8,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 4,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E1E1E'
    },
    candidateName: {
        fontSize: 16,
        color: '#E0E0E0'
    },
    assignedCandidateCard: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#BB86FC',
        borderRadius: 4,
        marginBottom: 8,
        backgroundColor: '#1E1E1E'
    },
    completeButton: {
        backgroundColor: '#BB86FC',
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 16,
        alignItems: 'center'
    },
    completeButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16
    },
    errorText: {
        color: '#CF6679',
        marginBottom: 16
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212'
    }
});
