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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getUserToken } from '@/services/userService';
import { getJobsProfile, GetJobsByUserIDForEmploye } from '@/services/JobsService';
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
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('employer');
    const [createJobVisible, setCreateJobVisible] = useState(false);
    // Paginación para cada sección
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageJobFeed, setCurrentPageJobFeed] = useState(1);

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

    // Cuando la sección activa sea "Mis trabajos", se solicita esa información
    useEffect(() => {
        if (!token) return;
        const fetchEmployerJobs = async () => {
            setLoading(true);
            try {
                const jobsData = await getJobsProfile(1, token);

                setEmployerJobs(jobsData?.jobs || []);
                setCurrentPageEmployer(1);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (activeSection === 'employer') {
            fetchEmployerJobs();
        }
    }, [activeSection, token]);

    // Cuando la sección activa sea "Trabajos realizados", se solicita esa información
    useEffect(() => {
        if (!token) return;
        const fetchJobFeed = async () => {
            setLoading(true);
            try {

                const feedData = await GetJobsByUserIDForEmploye(1, token);
                console.log(" TRABAJOS realizados");
                console.log(feedData.jobs);

                console.log(" TRABAJOS realizados");
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
            {/* Botón para abrir el formulario de creación de trabajo */}
            <TouchableOpacity
                style={styles.createJobButton}
                onPress={() => setCreateJobVisible(true)}
            >
                <Text style={styles.createJobButtonText}>Crear Trabajo</Text>
            </TouchableOpacity>
            {/* Modal de creación de trabajo */}
            <CreateJob
                visible={createJobVisible}
                onClose={() => setCreateJobVisible(false)}
            />
            {/* Botones para alternar entre secciones */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        activeSection === 'employer' && styles.activeToggle,
                    ]}
                    onPress={() => setActiveSection('employer')}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            activeSection === 'employer' && styles.activeToggleText,
                        ]}
                    >
                        Mis trabajos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        activeSection === 'jobFeed' && styles.activeToggle,
                    ]}
                    onPress={() => setActiveSection('jobFeed')}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            activeSection === 'jobFeed' && styles.activeToggleText,
                        ]}
                    >
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
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Cerrar sesión" onPress={handleLogout} />
            </View>
        );
    }

    return (
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
                    <Button title="Cerrar sesión" onPress={handleLogout} />
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { padding: 10, backgroundColor: '#121212' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    errorText: { color: '#CF6679', marginBottom: 20 },
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
    footer: {
        marginVertical: 20,
    },
});

