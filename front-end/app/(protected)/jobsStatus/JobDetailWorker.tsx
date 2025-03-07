import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    Button,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GetJobDetailvisited, provideWorkerFeedback } from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackSection } from '@/components/FeedbackSection';
import { useAuth } from '@/context/AuthContext';

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

    // Estado para el ID del usuario actual (trabajador)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
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
                <Button title="Volver" onPress={() => router.back()} color="#03DAC5" />
            </View>
        );
    }

    // Mostramos al empleador; al tocar, se redirige al perfil visitado
    const { userDetails } = jobDetail;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Área del empleador */}
            {userDetails && (
                <TouchableOpacity
                    style={styles.employerContainer}
                    // onPress={() => router.push(`/ProfileVisited?id=${userDetails.id}`)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarPlaceholder}>
                        {userDetails.avatar ? (
                            <Image source={{ uri: userDetails.avatar }} style={styles.avatar} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {userDetails.nameUser.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.employerName}>{userDetails.nameUser}</Text>
                </TouchableOpacity>
            )}

            {/* Información principal del trabajo */}
            <Text style={styles.title}>{jobDetail.title}</Text>
            <Text style={styles.description}>{jobDetail.description}</Text>
            <Text style={styles.detail}>
                Precio: ${jobDetail.budget || jobDetail.price}
            </Text>
            <Text style={styles.detail}>Estado: {jobDetail.status}</Text>
            {jobDetail.assignedCandidate && (
                <Text style={styles.detail}>
                    Asignado a: {jobDetail.assignedCandidate.nameUser}
                </Text>
            )}

            {/* Botón para abrir el chat */}
            <TouchableOpacity
                style={styles.chatButton}
                onPress={() =>
                    router.push(
                        `/ChatJobs?jobId=${jobDetail.id}&employerProfile=${encodeURIComponent(
                            JSON.stringify(jobDetail.userDetails)
                        )}`
                    )
                }
            >
                <Text style={styles.chatButtonText}>Abrir Chat</Text>
            </TouchableOpacity>

            {/* Mapa con la ubicación del trabajo */}
            {jobDetail.location && jobDetail.location.coordinates && (
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
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

            <Button title="Volver" onPress={() => router.back()} color="#03DAC5" />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#121212',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#E0E0E0',
    },
    description: {
        fontSize: 16,
        marginBottom: 8,
        color: '#E0E0E0',
    },
    detail: {
        fontSize: 16,
        marginBottom: 4,
        color: '#E0E0E0',
    },
    mapContainer: {
        height: 200,
        width: '100%',
        marginVertical: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    chatButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 10,
        borderRadius: 5,
        marginVertical: 16,
        alignItems: 'center',
    },
    chatButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    errorText: {
        color: '#CF6679',
        marginBottom: 16,
    },
    // Estilos para el área del empleador
    employerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#03DAC5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: '#121212',
        fontSize: 24,
        fontWeight: 'bold',
    },
    employerName: {
        fontSize: 18,
        color: '#E0E0E0',
        fontWeight: 'bold',
    },
});

