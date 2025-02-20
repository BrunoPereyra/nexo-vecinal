import React, { useEffect, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    Dimensions,
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
import { ProfileHeader } from '@/components/ProfileHeader';
import { CreateJob } from '@/components/CreateJob';
import { createReports } from '@/services/admin';
type Job = {
    id: string;
    title: string;
    status: string;
};

export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    // "Trabajos" usará los datos de GetJobsUserCompleted
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    // "Trabajos creados" usará los datos de GetJobsUserIDForEmployeProfilevist
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    // Sección activa: 'employer' para "Trabajos creados" o 'jobFeed' para "Trabajos"
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('jobFeed');
    const [createJobVisible, setCreateJobVisible] = useState(false);
    // Paginación
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageWorker, setCurrentPageWorker] = useState(1);
    // Estados de carga específicos para cada sección
    const [loadingEmployer, setLoadingEmployer] = useState(false);
    const [loadingWorker, setLoadingWorker] = useState(false);
    // Estado para guardar la calificación más reciente
    const [latestRating, setLatestRating] = useState<number | null>(null);
    // Estado para la descripción expandida
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    // Estados para el modal de reporte
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportMessage, setReportMessage] = useState('');

    // Cargar el perfil del usuario
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setError('Token no proporcionado');
                setGlobalLoading(false);
                return;
            }
            try {
                const cachedSection = await AsyncStorage.getItem('activeSection');
                if (cachedSection === 'jobFeed' || cachedSection === 'employer') {
                    setActiveSection(cachedSection as 'jobFeed' | 'employer');
                }
                const data = await getUserByid(id as string);
                if (data?.data) {
                    setUserProfile(data.data);
                }
            } catch (err: any) {
                setError('Error al obtener la información del usuario');
                console.error(err);
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

    // Cargar "Trabajos" (trabajos asignados al trabajador) con GetJobsUserCompleted
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'jobFeed' && workerJobs.length === 0) {
            setLoadingWorker(true);

            GetJobsUserCompleted(id as string)
                .then((jobsData) => {
                    console.log("AA");

                    console.log(jobsData);

                    setWorkerJobs(jobsData?.data || []);
                    setCurrentPageWorker(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingWorker(false));
        }
    }, [activeSection, token, id]);

    // Cargar "Trabajos creados" (trabajos publicados por el usuario) con GetJobsUserIDForEmployeProfilevist
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'employer' && employerJobs.length === 0) {
            setLoadingEmployer(true);
            GetJobsUserIDForEmployeProfilevist(1, id as string)
                .then((feedData) => {
                    setEmployerJobs(feedData?.jobs || []);
                    setCurrentPageEmployer(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingEmployer(false));
        }
    }, [activeSection, token, id]);

    // Solicitar el rating según la sección activa (no se modifica acá)
    useEffect(() => {
        const fetchRating = async () => {
            if (!id) return;
            let res;
            // Puedes ajustar la lógica del rating si corresponde a cada sección
            if (activeSection === 'employer') {
                res = await GetJobsUserCompleted(id);
            } else {
                res = await GetJobsUserIDForEmployeProfilevist(1, id);
            }
            if (res && res.Rating !== undefined) {
                setLatestRating(res.Rating);
            }
        };
        fetchRating();
    }, [activeSection, id]);

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

    // Función para cargar más trabajos en "Trabajos"
    const loadMoreWorkerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageWorker + 1;
        try {
            const newData = await GetJobsUserCompleted(id as string,);
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
                    <ProfileHeader user={userProfile} />
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
            {latestRating !== null && (
                <Text style={styles.ratingText}>
                    Calificación: {latestRating} {latestRating === 1 ? 'estrella' : 'estrellas'}
                </Text>
            )}
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(true)}>
                <Text style={styles.reportButtonText}>Reportar</Text>
            </TouchableOpacity>
            <CreateJob visible={createJobVisible} onClose={() => setCreateJobVisible(false)} />
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'jobFeed' && styles.activeToggle]}
                    onPress={() => setActiveSection('jobFeed')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'jobFeed' && styles.activeToggleText]}>
                        Trabajos
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

    // Función para enviar reporte
    const handleSendReport = async () => {
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
            console.log(res);
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
    };

    const renderItem = ({ item }: { item: Job }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/JobDetailVisited?id=${item.id}`)}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>Estado: {item.status}</Text>
        </TouchableOpacity>
    );

    // Dependiendo de la sección activa, usamos los datos correspondientes y la función onEndReached
    const data = activeSection === 'jobFeed' ? workerJobs : employerJobs;
    const onEndReached = activeSection === 'jobFeed' ? loadMoreWorkerJobs : loadMoreEmployerJobs;
    const sectionLoading = activeSection === 'jobFeed' ? loadingWorker : loadingEmployer;

    return (
        <View style={styles.outerContainer}>
            {sectionLoading && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#03DAC5" />
                </View>
            )}
            <FlatList
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.flatListContainer}
            />
            {/* Modal de reporte */}
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
                            <Button title="Enviar" onPress={handleSendReport} color="#03DAC5" />
                            <Button title="Cancelar" onPress={() => setReportModalVisible(false)} color="#03DAC5" />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    flatListContainer: {
        flexGrow: 1,
        padding: 10,
        backgroundColor: '#121212',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    errorText: {
        color: '#CF6679',
        marginBottom: 20,
    },
    ratingText: {
        fontSize: 16,
        color: '#03DAC5',
        textAlign: 'center',
        marginBottom: 10,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        backgroundColor: '#1E1E1E',
    },
    activeToggle: {
        backgroundColor: '#03DAC5',
    },
    toggleButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeToggleText: {
        color: '#121212',
    },
    createJobButton: {
        backgroundColor: '#03DAC5',
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 10,
    },
    createJobButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
    card: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 8,
        marginVertical: 6,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E0E0E0',
    },
    status: {
        fontSize: 14,
        color: '#B0B0B0',
        marginTop: 4,
    },
    descriptionContainer: {
        backgroundColor: '#1E1E1E',
        padding: 8,
        borderRadius: 5,
        marginBottom: 10,
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
    reportButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#03DAC5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 5,
        zIndex: 10,
    },
    reportButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 8,
        width: '80%',
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
        borderColor: '#444',
        borderRadius: 5,
        padding: 10,
        minHeight: 80,
        marginBottom: 12,
        backgroundColor: '#121212',
        color: '#E0E0E0',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
});

