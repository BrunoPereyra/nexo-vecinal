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
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Editbiografia, getUserToken } from '@/services/userService';
import {
    getJobsProfile,
    GetJobsByUserIDForEmploye,
    GetLatestJobsForEmployer,
    GetLatestJobsForWorker,
} from '@/services/JobsService';
import { ProfileHeader } from '@/components/ProfileHeader';
import { CreateJob } from '@/components/CreateJob';

export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [jobFeed, setJobFeed] = useState<any[]>([]);
    // Sección activa: 'employer' (Mis trabajos) o 'jobFeed' (Trabajos realizados)
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('jobFeed');
    const [createJobVisible, setCreateJobVisible] = useState(false);
    // Paginación para cada sección
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageJobFeed, setCurrentPageJobFeed] = useState(1);
    // Estado para guardar la calificación (rating) más reciente
    const [latestRating, setLatestRating] = useState<number | null>(null);
    // Estado para mostrar/ocultar el menú de opciones en la esquina superior derecha
    const [showDropdown, setShowDropdown] = useState(false);
    // Estados para editar la biografía
    const [editBioVisible, setEditBioVisible] = useState(false);
    const [biografia, setBiografia] = useState('');

    useEffect(() => {
        const fetchRating = async () => {
            if (!token) return;
            let res;
            if (activeSection === 'employer') {
                res = await GetLatestJobsForEmployer(token as string);
            } else {
                res = await GetLatestJobsForWorker(token as string);
            }
            console.log(res);
            if (res && res.Rating !== undefined) {
                setLatestRating(res.Rating);
            }
        };
        fetchRating();
    }, [activeSection, token]);

    // Al iniciar, cargar la última sección activa desde AsyncStorage y el perfil del usuario
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setError('Token no proporcionado');
                setLoading(false);
                return;
            }
            try {
                const cachedSection = await AsyncStorage.getItem('activeSection');
                if (cachedSection === 'jobFeed' || cachedSection === 'employer') {
                    setActiveSection(cachedSection);
                }
                const data = await getUserToken(token);
                if (data?.data) {
                    setUserProfile(data.data);
                    // Opcional: cargar la biografía actual desde el perfil
                    setBiografia(data.data.Biography || '');
                }
            } catch (err: any) {
                setError('Error al obtener la información del usuario');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    // Guardar la sección activa en AsyncStorage cada vez que cambie
    useEffect(() => {
        AsyncStorage.setItem('activeSection', activeSection);
    }, [activeSection]);


    // Cuando la sección activa sea "Trabajos realizados", se solicita esa información
    useEffect(() => {
        if (!token) return;
        const fetchJobFeed = async () => {
            setLoading(true);
            try {
                const feedData = await GetJobsByUserIDForEmploye(1, token);
                setJobFeed(feedData?.jobs || []);
                setCurrentPageJobFeed(1);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (activeSection === 'jobFeed') {
            fetchJobFeed();
        }
    }, [activeSection, token]);

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    // Función para abrir el modal de edición de biografía
    const HandleEditbiografia = () => {
        setEditBioVisible(true);
        setShowDropdown(false);
    };

    // Función para guardar la biografía tras la validación
    const handleSaveBiografia = async () => {
        if (biografia.length < 10 || biografia.length > 100) {
            Alert.alert('Error', 'La biografía debe tener entre 10 y 100 caracteres.');
            return;
        }
        // Aquí podrías llamar a una API para actualizar la biografía del usuario.
        const resEdit = await Editbiografia(biografia, token as string);
        console.log(resEdit);
        setEditBioVisible(false);
    };

    // Función para el botón "Subscribirse"
    const handleSubscribe = () => {
        Alert.alert('Subscribirse', 'Función no implementada.');
        setShowDropdown(false);
    };

    // Función para cerrar sesión desde el menú
    const handleLogoutOption = () => {
        setShowDropdown(false);
        handleLogout();
    };

    // Función para cargar más trabajos en "Mis trabajos"
    const loadMoreEmployerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await getJobsProfile(nextPage, token);
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
            const newData = await GetJobsByUserIDForEmploye(nextPage, token);
            if (newData?.jobs) {
                setJobFeed(prev => [...prev, ...newData.jobs]);
                setCurrentPageJobFeed(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Encabezado que se renderiza antes de la lista
    const ListHeader = () => (
        <View>
            {userProfile && <ProfileHeader user={userProfile} />}
            {latestRating !== null && (
                <Text style={styles.ratingText}>
                    Calificación: {latestRating} {latestRating === 1 ? 'estrella' : 'estrellas'}
                </Text>
            )}
            {/* Botón para abrir el formulario de creación de trabajo */}
            <TouchableOpacity
                style={styles.createJobButton}
                onPress={() => setCreateJobVisible(true)}
            >
                <Text style={styles.createJobButtonText}>Crear Trabajo</Text>
            </TouchableOpacity>
            {/* Modal de creación de trabajo */}
            <CreateJob visible={createJobVisible} onClose={() => setCreateJobVisible(false)} />
            {/* Botones para alternar entre secciones */}
            <View style={styles.toggleContainer}>
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

    // Renderizamos cada ítem de la lista según la sección activa
    const renderItem: ListRenderItem<any> = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    router.push(`/EmployerJobDetail?id=${item.id}`);
                }}
            >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.status}>Estado: {item.status}</Text>
            </TouchableOpacity>
        );
    };

    const data = activeSection === 'employer' ? employerJobs : jobFeed;
    const onEndReached =
        activeSection === 'employer' ? loadMoreEmployerJobs : loadMoreJobFeed;

    if (loading) {
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

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.container}
                ListFooterComponent={
                    <View style={styles.footer}>
                        <Button title="Cerrar sesión" onPress={handleLogout} color="#03DAC5" />
                    </View>
                }
            />
            {/* Botón de opciones en la esquina superior derecha */}
            <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <Text style={styles.optionsButtonText}>⋮</Text>
            </TouchableOpacity>
            {showDropdown && (
                <View style={styles.dropdown}>
                    <TouchableOpacity onPress={HandleEditbiografia} style={styles.dropdownButton}>
                        <Text style={styles.dropdownButtonText}>Cambiar descripción</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSubscribe} style={styles.dropdownButton}>
                        <Text style={styles.dropdownButtonText}>Subscribirse</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleLogoutOption}
                        style={[styles.dropdownButton, styles.dropdownLogout]}
                    >
                        <Text style={styles.dropdownButtonText}>Cerrar sesión</Text>
                    </TouchableOpacity>
                </View>
            )}
            {/* Modal para editar la biografía */}
            <Modal visible={editBioVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Biografía</Text>
                        <TextInput
                            style={styles.modalTextInput}
                            placeholder="Ingresa tu biografía (10-100 caracteres)"
                            placeholderTextColor="#888"
                            value={biografia}
                            onChangeText={setBiografia}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Cancelar" onPress={() => setEditBioVisible(false)} color="#CF6679" />
                            <Button title="Guardar" onPress={handleSaveBiografia} color="#03DAC5" />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: '#121212'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212'
    },
    errorText: {
        color: '#CF6679',
        marginBottom: 20
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
    footer: {
        marginVertical: 20,
    },
    ratingText: {
        fontSize: 16,
        color: '#03DAC5',
        textAlign: 'center',
        marginBottom: 10,
    },
    optionsButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 10,
        backgroundColor: '#1E1E1E',
        borderRadius: 5,
        zIndex: 100,
    },
    optionsButtonText: {
        color: '#E0E0E0',
        fontSize: 18,
    },
    dropdown: {
        position: 'absolute',
        top: 50,
        right: 10,
        backgroundColor: '#1E1E1E',
        borderRadius: 5,
        paddingVertical: 5,
        zIndex: 99,
    },
    dropdownButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    dropdownButtonText: {
        color: '#E0E0E0',
        fontSize: 16,
    },
    dropdownLogout: {
        borderTopWidth: 1,
        borderColor: '#444',
        marginTop: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#121212',
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 10,
    },
    modalTextInput: {
        height: 100,
        borderColor: '#1E1E1E',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        color: '#E0E0E0',
        backgroundColor: '#1E1E1E',
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

