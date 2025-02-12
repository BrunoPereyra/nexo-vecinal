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
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { getUserToken } from '@/services/userService';
import { ProfileHeader } from '@/components/ProfileHeader';
import { CreateJob } from '@/components/CreateJob';

export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    // Simulamos que cada trabajo tiene también un campo "status"
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [jobFeed, setJobFeed] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('employer');
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
                    // Datos de ejemplo para "Mis trabajos"
                    setEmployerJobs([
                        { id: '1', title: 'Reparación de cañerías', status: 'Abierto' },
                        { id: '2', title: 'Pintura de casa', status: 'Completado' },
                    ]);
                    // Datos de ejemplo para "Trabajos realizados"
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

    // Función para cargar 10 trabajos más (sólo para "Mis trabajos")
    const loadMoreEmployerJobs = async () => {
        setEmployerJobs((prevJobs) => {
            const newJobs = [];
            for (let i = 1; i <= 10; i++) {
                newJobs.push({
                    id: `${prevJobs.length + i}`,
                    title: `Nuevo trabajo ${prevJobs.length + i}`,
                    status: 'Abierto',
                });
            }
            return [...prevJobs, ...newJobs];
        });
    };

    // Si se está cargando o hay error, se retorna un contenido fijo
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

    // Encabezado que se renderizará antes de la lista
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
                    style={[styles.toggleButton, activeSection === 'employer' && styles.activeToggle]}
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
                    style={[styles.toggleButton, activeSection === 'jobFeed' && styles.activeToggle]}
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
        if (activeSection === 'employer') {
            return (
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => {
                        router.push(`/EmployerJobDetail?id=${item.id}`)
                    }}
                >
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.status}>Estado: {item.status}</Text>
                </TouchableOpacity>
            );
        } else {
            // Ejemplo de renderizado para "Trabajos realizados"
            return (
                <View style={styles.card}>
                    <Text>Job Feed Item {item.id}</Text>
                </View>
            );
        }
    };

    // Seleccionamos los datos y la función de carga según la sección activa
    const data = activeSection === 'employer' ? employerJobs : jobFeed;
    const onEndReached = activeSection === 'employer' ? loadMoreEmployerJobs : undefined;

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id}
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
    container: {
        padding: 10,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 20,
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
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginVertical: 6,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    status: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    footer: {
        marginVertical: 20,
    },
});
