// /screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    Button,
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getUserToken } from '@/services/userService';
import { ProfileHeader } from '@/components/ProfileHeader';
import { EmployerJobsSection } from '@/components/EmployerJobsSection';
import { JobFeed } from '@/components/JobFeed';
import { CreateJob } from '@/components/CreateJob';

export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [jobFeed, setJobFeed] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('employer');

    // Estado para controlar la visibilidad del modal para crear un trabajo
    const [createJobVisible, setCreateJobVisible] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setError('Token no proporcionado');
                setLoading(false);
                return;
            }
            try {
                const data = await getUserToken(token);
                if (data?.data) {
                    setUserProfile(data.data);
                    // Simulación de datos
                    setEmployerJobs([
                        { id: '1', title: 'Reparación de cañerías' },
                        { id: '2', title: 'Pintura de casa' },
                    ]);
                    setJobFeed([
                        { id: 'a', imageUrl: 'https://via.placeholder.com/150' },
                        { id: 'b', imageUrl: 'https://via.placeholder.com/150' },
                        { id: 'c', imageUrl: 'https://via.placeholder.com/150' },
                        { id: 'd', imageUrl: 'https://via.placeholder.com/150' },
                        { id: 'e', imageUrl: 'https://via.placeholder.com/150' },
                        { id: 'f', imageUrl: 'https://via.placeholder.com/150' },
                    ]);
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

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    // Función para cargar 10 trabajos más al llegar al final de la lista
    const loadMoreEmployerJobs = async () => {
        // Simulación: agregar 10 trabajos nuevos
        setEmployerJobs((prevJobs) => {
            const newJobs = [];
            for (let i = 1; i <= 10; i++) {
                newJobs.push({
                    id: `${prevJobs.length + i}`,
                    title: `Nuevo trabajo ${prevJobs.length + i}`,
                });
            }
            return [...prevJobs, ...newJobs];
        });
    };

    // Función para manejar la creación de un nuevo trabajo
    const handleCreateJob = (job: { title: string; description: string }) => {
        // Aquí puedes integrar una llamada a tu API para crear el trabajo.
        // Por simplicidad, lo agregamos a la lista de trabajos publicados.
        setEmployerJobs((prevJobs) => [
            { id: `${prevJobs.length + 1}`, title: job.title },
            ...prevJobs,
        ]);
    };

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
        <ScrollView style={styles.container}>
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
            // onSubmit={handleCreateJob}
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

            {activeSection === 'employer' ? (
                <EmployerJobsSection jobs={employerJobs} onLoadMore={loadMoreEmployerJobs} />
            ) : (
                <JobFeed jobs={jobFeed} />
            )}

            <Button title="Cerrar sesión" onPress={handleLogout} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'red', marginBottom: 20 },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        backgroundColor: '#ddd',
    },
    activeToggle: {
        backgroundColor: '#3498db',
    },
    toggleButtonText: {
        fontSize: 16,
        color: '#000',
    },
    activeToggleText: {
        color: '#fff',
    },
    createJobButton: {
        backgroundColor: '#2ecc71',
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 10,
    },
    createJobButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
