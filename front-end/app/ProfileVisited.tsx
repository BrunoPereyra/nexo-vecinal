// /screens/ProfileScreen.tsx (o en app/ si usas Expo Router)
import React, { useEffect, useState } from 'react';
import {
    View,
    Button,
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    FlatList,
    ListRenderItem,
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserByid } from '@/services/userService';
import {
    getJobsProfileVist,
    GetJobsUserIDForEmployeProfilevist,
    GetLatestJobsForWorkervist,
    GetLatestJobsForEmployervist,
    // Función de reporte en el servicio
} from '@/services/JobsService';
import { ProfileHeader } from '@/components/ProfileHeader';
import { CreateJob } from '@/components/CreateJob';
import { createReports } from '@/services/admin';

export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [jobFeed, setJobFeed] = useState<any[]>([]);
    // Sección activa: 'employer' (Mis trabajos) o 'jobFeed' (Trabajos realizados)
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('employer');
    const [createJobVisible, setCreateJobVisible] = useState(false);
    // Paginación para cada sección
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageJobFeed, setCurrentPageJobFeed] = useState(1);
    // Estados de carga específicos para cada sección
    const [loadingEmployer, setLoadingEmployer] = useState(false);
    const [loadingJobFeed, setLoadingJobFeed] = useState(false);
    // Estado para guardar la calificación (rating) más reciente
    const [latestRating, setLatestRating] = useState<number | null>(null);
    // Estado para la descripción expandida
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    // Estados para el modal de reporte
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportMessage, setReportMessage] = useState('');

    // Al iniciar, cargar la última sección activa y el perfil del usuario
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
                    setActiveSection(cachedSection);
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

    // Cargar "Mis trabajos" si está activa y aún no se han cargado
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'employer' && employerJobs.length === 0) {
            setLoadingEmployer(true);
            getJobsProfileVist(1, id as string)
                .then((jobsData) => {
                    setEmployerJobs(jobsData?.jobs || []);
                    setCurrentPageEmployer(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingEmployer(false));
        }
    }, [activeSection, token, employerJobs.length, id]);

    // Cargar "Trabajos realizados" si está activa y aún no se han cargado
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'jobFeed' && jobFeed.length === 0) {
            setLoadingJobFeed(true);
            GetJobsUserIDForEmployeProfilevist(1, id as string)
                .then((feedData) => {
                    setJobFeed(feedData?.jobs || []);
                    setCurrentPageJobFeed(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingJobFeed(false));
        }
    }, [activeSection, token, jobFeed.length, id]);

    // Cada vez que cambie la sección activa o el id, solicitar el rating
    useEffect(() => {
        const fetchRating = async () => {
            if (!id) return;
            let res;
            if (activeSection === 'employer') {
                res = await GetLatestJobsForEmployervist(id);
            } else {
                res = await GetLatestJobsForWorkervist(id);
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

    // Función para cargar más trabajos en "Mis trabajos"
    const loadMoreEmployerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await getJobsProfileVist(nextPage, id as string);
            if (newData?.jobs) {
                setEmployerJobs(prev => [...prev, ...newData.jobs]);
                setCurrentPageEmployer(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Función para cargar más trabajos en "Trabajos realizados"
    const loadMoreJobFeed = async () => {
        if (!token) return;
        const nextPage = currentPageJobFeed + 1;
        try {
            const newData = await GetJobsUserIDForEmployeProfilevist(nextPage, id as string);
            if (newData?.jobs) {
                setJobFeed(prev => [...prev, ...newData.jobs]);
                setCurrentPageJobFeed(nextPage);
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
                    {/* Descripción del usuario truncada */}
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
            {/* Botón de reporte en la esquina superior derecha */}
            <TouchableOpacity
                style={styles.reportButton}
                onPress={() => setReportModalVisible(true)}
            >
                <Text style={styles.reportButtonText}>Reportar</Text>
            </TouchableOpacity>
            <CreateJob visible={createJobVisible} onClose={() => setCreateJobVisible(false)} />
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'employer' && styles.activeToggle]}
                    onPress={() => setActiveSection('employer')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'employer' && styles.activeToggleText]}>
                        Mis trabajos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'jobFeed' && styles.activeToggle]}
                    onPress={() => setActiveSection('jobFeed')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'jobFeed' && styles.activeToggleText]}>
                        Trabajos realizados
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Estado y función para el modal de reporte
    const handleSendReport = async () => {
        if (!reportMessage.trim() || !token || !id) {
            alert('El reporte no puede estar vacío');
            return;
        }
        try {
            // Se crea el objeto reporte con el ID del usuario reportado y el mensaje
            const reportData = {
                reportedUserId: id,  // ID del usuario que se está reportando
                text: reportMessage, // Mensaje del reporte
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


    // Renderizamos cada ítem de la lista
    const renderItem: ListRenderItem<any> = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                router.push(`/JobDetailVisited?id=${item.id}`);
            }}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>Estado: {item.status}</Text>
        </TouchableOpacity>
    );

    const data = activeSection === 'employer' ? employerJobs : jobFeed;
    const onEndReached = activeSection === 'employer' ? loadMoreEmployerJobs : loadMoreJobFeed;
    const sectionLoading = activeSection === 'employer' ? loadingEmployer : loadingJobFeed;

    if (false) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.outerContainer}>
            {sectionLoading && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0000ff" />
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
                            <Button title="Enviar" onPress={handleSendReport} />
                            <Button title="Cancelar" onPress={() => setReportModalVisible(false)} color="#BB86FC" />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#121212' },
    flatListContainer: { flexGrow: 1, padding: 10, backgroundColor: '#121212' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    errorText: { color: '#CF6679', marginBottom: 20 },
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
        backgroundColor: '#333',
    },
    activeToggle: {
        backgroundColor: '#BB86FC',
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
        backgroundColor: '#CF6679',
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

