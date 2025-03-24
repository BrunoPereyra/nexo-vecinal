import React, { useEffect, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TextInput,
    Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserByid } from '@/services/userService';
import {
    GetJobsUserIDForEmployeProfilevist,
    GetJobsUserCompleted,
} from '@/services/JobsService';
import { ProfileVisitedHeader } from '@/components/headersProfile/ProfileVisitedHeader';
import { createReports } from '@/services/admin';
import { JobCardProfiles } from '@/components/jobCards/JobCardProfiles';
import { Ionicons } from '@expo/vector-icons';

type Job = {
    id: string;
    title: string;
    status: string;
};

export default function VisitedProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('jobFeed');
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageWorker, setCurrentPageWorker] = useState(1);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportMessage, setReportMessage] = useState('');
    const [loading, setLoading] = useState<boolean>(true);

    // Cargar el perfil del usuario visitado
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setError('Token no proporcionado');
                setGlobalLoading(false);
                return;
            }
            try {
                // Si se tiene guardada la sección activa, la usamos
                const cachedSection = await AsyncStorage.getItem('activeSection');
                if (cachedSection === 'jobFeed' || cachedSection === 'employer') {
                    setActiveSection(cachedSection as 'jobFeed' | 'employer');
                }
                const data = await getUserByid(id as string);
                if (data?.data) {
                    setUserProfile(data.data);
                    console.log(data.data);

                    setLoading(false)
                }
            } catch (err: any) {
                setError('Error al obtener la información del usuario');
            } finally {
                setGlobalLoading(false);
            }
        };
        fetchProfile();
    }, [token, id]);

    // Guardar la sección activa en AsyncStorage
    useEffect(() => {
        AsyncStorage.setItem('activeSection', activeSection);
    }, [activeSection]);

    // Cargar "Trabajos realizados" (trabajos asignados al usuario, como trabajador)
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'jobFeed' && workerJobs.length === 0) {
            GetJobsUserCompleted(id as string)
                .then((jobsData) => {
                    setWorkerJobs(jobsData?.data || []);
                    setCurrentPageWorker(1);
                })
                .catch((error) => console.error(error))
        }
    }, [activeSection, token, id]);

    // Cargar "Trabajos creados" (trabajos publicados por el usuario)
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'employer' && employerJobs.length === 0) {
            GetJobsUserIDForEmployeProfilevist(1, id as string)
                .then((feedData) => {
                    setEmployerJobs(feedData?.jobs || []);
                    setCurrentPageEmployer(1);
                })
                .catch((error) => console.error(error))
        }
    }, [activeSection, token, id]);


    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    // Función para cargar más trabajos en "Trabajos creados"
    const loadMoreEmployerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await GetJobsUserIDForEmployeProfilevist(nextPage, id as string);
            if (newData?.jobs) {
                setEmployerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageEmployer(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Función para cargar más trabajos en "Trabajos realizados"
    const loadMoreWorkerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageWorker + 1;
        try {
            const newData = await GetJobsUserCompleted(id as string);
            if (newData?.jobs) {
                setWorkerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageWorker(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Encabezado de la lista
    const ListHeader = () => (
        <View>
            {userProfile && (
                <>
                    <ProfileVisitedHeader user={userProfile} />
                    {userProfile.description && (
                        <View style={styles.descriptionContainer}>
                            <Text style={styles.userDescription}>
                                {descriptionExpanded || userProfile.description.length <= 100
                                    ? userProfile.description
                                    : `${userProfile.description.substring(0, 100)}... `}
                            </Text>
                            {userProfile.description.length > 100 && (
                                <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
                                    <Text style={styles.seeMoreText}>
                                        {descriptionExpanded ? 'Ver menos' : 'Ver más'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </>
            )}
            {/* {latestRating !== null && (
                <View style={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                            key={star}
                            style={[
                                styles.star,
                                star <= latestRating ? styles.selectedStar : styles.unselectedStar,
                            ]}
                        >
                            ★
                        </Text>
                    ))}
                    <Text style={styles.ratingText}>
                        {latestRating} {latestRating === 1 ? 'estrella' : 'estrellas'}
                    </Text>
                </View>
            )} */}
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(true)}>
                <Text style={styles.reportButtonText}>Reportar</Text>
            </TouchableOpacity>
            {/* Si se desea permitir la creación de trabajos en perfil de visita, se podría habilitar */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'jobFeed' && styles.activeToggle]}
                    onPress={() => setActiveSection('jobFeed')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'jobFeed' && styles.activeToggleText]}>
                        Trabajos realizados
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'employer' && styles.activeToggle]}
                    onPress={() => setActiveSection('employer')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'employer' && styles.activeToggleText]}>
                        Trabajos creados
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading || !userProfile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    const renderItem = ({ item }: { item: any }) => {

        return <JobCardProfiles item={item} activeSection={activeSection} />
    }

    const data = activeSection === 'jobFeed' ? workerJobs : employerJobs;
    const onEndReached = activeSection === 'jobFeed' ? loadMoreWorkerJobs : loadMoreEmployerJobs;

    if (globalLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Cerrar sesión" onPress={handleLogout} color="#03DAC5" />
            </View>
        );
    }
    if (loading || !userProfile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }
    return (
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
            <FlatList
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContainer}
            />
            <Modal
                visible={reportModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enviar Reporte</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Escribe tu reporte..."
                            placeholderTextColor="#888"
                            value={reportMessage}
                            onChangeText={setReportMessage}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <Button
                                title="Enviar"
                                onPress={async () => {
                                    if (!reportMessage.trim() || !token || !id) {
                                        alert('El reporte no puede estar vacío');
                                        return;
                                    }
                                    try {
                                        const reportData = {
                                            reportedUserId: id,
                                            text: reportMessage,
                                        };
                                        const res = await createReports(reportData, token);
                                        if (res && res.reporterUserId) {
                                            alert('Reporte enviado exitosamente');
                                            setReportMessage('');
                                            setReportModalVisible(false);
                                        } else {
                                            alert('No se pudo enviar el reporte');
                                        }
                                    } catch (error) {
                                        console.error('Error enviando reporte:', error);
                                        alert('Ocurrió un error al enviar el reporte');
                                    }
                                }}
                                color="#03DAC5"
                            />
                            <Button title="Cancelar" onPress={() => setReportModalVisible(false)} color="#03DAC5" />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Botón flotante para abrir el chat */}
            {
                userProfile &&
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() =>
                        router.push(
                            `/(protected)/(chat)/ChatScreen?employerProfile=${encodeURIComponent(
                                JSON.stringify({ id: userProfile.id, avatar: userProfile.Avatar, nameUser: userProfile.NameUser })
                            )}&origin=profileVisited`
                        )
                    }
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#121212" />
                </TouchableOpacity>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: '#0f2027',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f2027',
    },
    errorText: {
        color: '#CF6679',
        marginBottom: 20,
        fontSize: 16,
    },
    descriptionContainer: {
        backgroundColor: '#203a43',
        padding: 8,
        borderRadius: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#2c5364',
    },
    userDescription: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    seeMoreText: {
        fontSize: 14,
        color: '#03DAC5',
        marginTop: 4,
        textDecorationLine: 'underline',
    },
    starContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    star: {
        fontSize: 24,
        marginHorizontal: 4,
    },
    selectedStar: {
        color: '#03DAC5',
    },
    unselectedStar: {
        color: '#2c5364',
    },
    ratingText: {
        fontSize: 16,
        color: '#03DAC5',
        textAlign: 'center',
        marginLeft: 8,
        fontWeight: '600',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginVertical: 12,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#203a43',
        borderWidth: 1,
        borderColor: '#2c5364',
    },
    activeToggle: {
        backgroundColor: '#03DAC5',
        borderColor: '#03DAC5',
    },
    toggleButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeToggleText: {
        color: '#0f2027',
        fontWeight: 'bold',
    },
    reportButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#203a43',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#2c5364',
        zIndex: 10,
    },
    reportButtonText: {
        color: '#E0E0E0',
        fontWeight: 'bold',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#203a43',
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#2c5364',
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 4,
    },
    cardStatus: {
        fontSize: 14,
        color: '#B0B0B0',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#203a43',
        padding: 20,
        borderRadius: 8,
        width: '80%',
        borderWidth: 1,
        borderColor: '#2c5364',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#2c5364',
        borderRadius: 5,
        padding: 10,
        minHeight: 80,
        marginBottom: 12,
        backgroundColor: '#0f2027',
        color: '#E0E0E0',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#03DAC5',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2c5364',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    fabText: {
        color: '#0f2027',
        fontSize: 30,
        fontWeight: 'bold',
    },
});
