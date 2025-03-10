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
import { getUserByid } from '@/services/userService';
import { ProfileVisitedHeader } from '@/components/headersProfile/ProfileVisitedHeader';
import {
    GetJobsUserIDForEmployeProfilevist,
    GetJobsUserCompleted,
    GetLatestJobsForWorkervist,
    GetLatestJobsForEmployervist,
} from '@/services/JobsService';
import { JobCardProfiles } from '../jobCards/JobCardProfiles';
import { Ionicons } from '@expo/vector-icons';

interface VisitedProfileModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
}

const VisitedProfileModal: React.FC<VisitedProfileModalProps> = ({ visible, onClose, userId }) => {
    const { token, logout } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('jobFeed');
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageWorker, setCurrentPageWorker] = useState(1);
    const [loadingEmployer, setLoadingEmployer] = useState(false);
    const [loadingWorker, setLoadingWorker] = useState(false);
    const [latestRating, setLatestRating] = useState<number | null>(null);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    // Cargar perfil del usuario visitado
    useEffect(() => {
        if (!visible) return;
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
                const data = await getUserByid(userId);
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
    }, [token, userId, visible]);

    // Guardar la sección activa
    useEffect(() => {
        AsyncStorage.setItem('activeSection', activeSection);
    }, [activeSection]);

    // Cargar "Trabajos realizados"
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'jobFeed' && workerJobs.length === 0) {
            setLoadingWorker(true);
            GetJobsUserCompleted(userId)
                .then((jobsData) => {
                    setWorkerJobs(jobsData?.data || []);
                    setCurrentPageWorker(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingWorker(false));
        }
    }, [activeSection, token, userId]);

    // Cargar "Trabajos creados"
    useEffect(() => {
        if (!token) return;
        if (activeSection === 'employer' && employerJobs.length === 0) {
            setLoadingEmployer(true);
            GetJobsUserIDForEmployeProfilevist(1, userId)
                .then((feedData) => {
                    setEmployerJobs(feedData?.jobs || []);
                    setCurrentPageEmployer(1);
                })
                .catch((error) => console.error(error))
                .finally(() => setLoadingEmployer(false));
        }
    }, [activeSection, token, userId]);

    // Obtener rating más reciente
    useEffect(() => {
        const fetchRating = async () => {
            if (!userId) return;
            let res;
            if (activeSection === 'employer') {
                res = await GetLatestJobsForEmployervist(userId);
            } else {
                res = await GetLatestJobsForWorkervist(userId);
            }
            if (res && res.Rating !== undefined) {
                setLatestRating(res.Rating);
            }
        };
        fetchRating();
    }, [activeSection, userId]);

    // Funciones para paginación
    const loadMoreEmployerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await GetJobsUserIDForEmployeProfilevist(nextPage, userId);
            if (newData?.jobs) {
                setEmployerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageEmployer(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadMoreWorkerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageWorker + 1;
        try {
            const newData = await GetJobsUserCompleted(userId);
            if (newData?.jobs) {
                setWorkerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageWorker(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (globalLoading) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#03DAC5" />
                </View>
            </Modal>
        );
    }

    if (error) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button
                        title="Cerrar sesión"
                        onPress={async () => {
                            await logout();
                        }}
                        color="#03DAC5"
                    />
                    <Button title="Cerrar" onPress={onClose} color="#03DAC5" />
                </View>
            </Modal>
        );
    }

    // Encabezado con la información del perfil
    const ListHeader = () => (
        <View>
            {userProfile && <ProfileVisitedHeader user={userProfile} />}
            {userProfile?.description && (
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
            {/* {latestRating !== null && (
                <View style={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                            key={star}
                            style={[styles.star, star <= latestRating ? styles.selectedStar : styles.unselectedStar]}
                        >
                            ★
                        </Text>
                    ))}
                    <Text style={styles.ratingText}>
                        {latestRating} {latestRating === 1 ? 'estrella' : 'estrellas'}
                    </Text>
                </View>
            )} */}

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

    // Renderizado de cada item (trabajo)
    const renderItem = ({ item }: { item: any }) => {
        return <JobCardProfiles item={item} activeSection={activeSection} />
    }


    const data = activeSection === 'jobFeed' ? workerJobs : employerJobs;
    const onEndReached = activeSection === 'jobFeed' ? loadMoreWorkerJobs : loadMoreEmployerJobs;

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close-circle-outline" size={32} color="#03DAC5" />
                    </TouchableOpacity>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListHeaderComponent={ListHeader}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={styles.listContainer}
                    />
                </View>
            </Modal>


        </>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#03DAC5',
    },
    listContainer: {
        flexGrow: 1,
        padding: 6,
        backgroundColor: '#121212',
        paddingTop: 10, // Espacio para que no tape el botón de cerrar
    },
    center: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#CF6679',
        fontSize: 16,
        marginBottom: 20,
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
        color: '#F1C40F',
    },
    unselectedStar: {
        color: '#444',
    },
    ratingText: {
        fontSize: 16,
        color: '#03DAC5',
        marginLeft: 8,
        fontWeight: '600',
    },
    reportButton: {
        alignSelf: 'flex-end',
        backgroundColor: '#03DAC5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 5,
        marginBottom: 12,
    },
    reportButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 14,
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
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#444',
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
        color: '#121212',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
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

export default VisitedProfileModal;
