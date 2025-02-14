import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Button,
    Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { applyToJob, jobIdEmployee } from '../services/JobsService';

const JobDetail: React.FC = () => {
    // Se obtiene el id del job desde la URL y el token desde el contexto de autenticación
    const { id } = useLocalSearchParams();
    const { token } = useAuth();

    // Usamos any para manejar la información que llega directamente de la API
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                // Se consulta la API y se espera que el resultado tenga la propiedad "job"
                const result = await jobIdEmployee(id as string, token as string);
                console.log(result);

                if (result && result.job) {
                    setJob(result.job);
                }
            } catch (error) {
                console.error('Error al obtener los detalles del job:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [id, token]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007BFF" />
            </View>
        );
    }

    if (!job) {
        return (
            <View style={styles.centered}>
                <Text>No se encontró el trabajo.</Text>
            </View>
        );
    }
    const handleApply = async () => {

        const res = await applyToJob(id as string, token as string)
        console.log(res);

        if (res.message === "Applied to job successfully") {
            Alert.alert('Postulación enviada', 'Has postulado exitosamente a este trabajo.');
        }
    };
    // Asumimos que job.location.coordinates viene en formato [longitud, latitud]
    const region = {
        latitude: job.location.coordinates[1],
        longitude: job.location.coordinates[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.description}>{job.description}</Text>

            <View style={styles.section}>
                <Text style={styles.label}>Presupuesto:</Text>
                <Text style={styles.value}>${job.budget}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Estado:</Text>
                <Text style={styles.value}>{job.status}</Text>
            </View>

            {/* Perfil del Empleador */}
            {job.user && (
                <View style={styles.employerContainer}>
                    <Text style={styles.sectionTitle}>Perfil del Empleador</Text>
                    <View style={styles.employerInfo}>
                        {job.user.avatar ? (
                            <Image source={{ uri: job.user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {job.user.nameUser.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.employerName}>{job.user.nameUser}</Text>
                    </View>
                </View>
            )}

            {/* Mapa con la ubicación del job */}
            {job.location && (
                <View style={styles.mapContainer}>
                    <MapView style={styles.map} initialRegion={region} region={region}>
                        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                    </MapView>
                </View>
            )}
            <View style={styles.applyButtonContainer}>
                <Button title="Postularme al Trabajo" onPress={handleApply} color="#007BFF" />
            </View>
        </ScrollView>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#E0E0E0',
    },
    description: {
        fontSize: 16,
        color: '#B0B0B0',
        marginBottom: 20,
    },
    section: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginRight: 8,
    },
    value: {
        fontSize: 16,
        color: '#B0B0B0',
    },
    employerContainer: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#BB86FC',
    },
    employerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#BB86FC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#121212',
        fontSize: 24,
        fontWeight: 'bold',
    },
    employerName: {
        fontSize: 18,
        color: '#E0E0E0',
    },
    mapContainer: {
        marginTop: 20,
        width: '100%',
        height: 250,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    applyButtonContainer: {
        marginTop: 20,
    },
});

export default JobDetail;
