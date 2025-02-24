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
    TouchableOpacity,
    TextInput
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { applyToJob, jobIdEmployee } from '../services/JobsService';

const JobDetail: React.FC = () => {
    // Obtenemos el id del job desde la URL y el token desde el contexto de autenticación
    const { id } = useLocalSearchParams();
    const { token } = useAuth();
    const router = useRouter();

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    // Estados para la propuesta, precio y para mostrar u ocultar los inputs
    const [proposal, setProposal] = useState("");
    const [price, setPrice] = useState("");
    const [showInputs, setShowInputs] = useState(false);

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                const result = await jobIdEmployee(id as string, token as string);
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
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    if (!job) {
        return (
            <View style={styles.centered}>
                <Text style={styles.messageText}>No se encontró el trabajo.</Text>
            </View>
        );
    }

    const handleApply = async () => {
        // Si aún no se han mostrado los inputs, al presionar se despliegan
        if (!showInputs) {
            setShowInputs(true);
            return;
        }

        // Validación en el cliente para la propuesta y precio
        if (proposal.trim().length < 10 || proposal.trim().length > 100) {
            Alert.alert("Error", "La propuesta debe tener entre 10 y 100 caracteres");
            return;
        }
        const numericPrice = parseInt(price, 10);
        if (isNaN(numericPrice) || numericPrice < 100 || numericPrice > 10000000) {
            Alert.alert("Error", "El precio debe estar entre 100 y 10,000,000");
            return;
        }

        const res = await applyToJob(id as string, proposal, numericPrice, token as string);
        console.log(res);

        if (res.message === 'Applied to job successfully') {
            Alert.alert('Postulación enviada', 'Has postulado exitosamente a este trabajo.');
            // Opcional: puedes resetear los inputs o navegar a otra pantalla
        } else {
            Alert.alert('Error', res.error || 'Ocurrió un error al postularse');
        }
    };

    // Se asume que job.location.coordinates viene en formato [longitud, latitud]
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
                        <TouchableOpacity
                            onPress={() => router.push(`/ProfileVisited?id=${job.user.id}`)}
                            style={styles.avatarPlaceholder}
                            activeOpacity={0.7}
                        >
                            {job.user.avatar ? (
                                <Image source={{ uri: job.user.avatar }} style={styles.avatar} />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {job.user.nameUser.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </TouchableOpacity>
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

            {/* Sección para mostrar/ocultar los inputs */}
            {showInputs && (
                <View style={styles.applyForm}>
                    <TextInput
                        placeholder="Ingresa tu propuesta (10-100 caracteres)"
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={proposal}
                        onChangeText={setProposal}
                    />
                    <TextInput
                        placeholder="Ingresa el precio (100 - 10,000,000)"
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />
                </View>
            )}

            <View style={styles.applyButtonContainer}>
                <Button
                    title={showInputs ? "Enviar Propuesta" : "Postularme al Trabajo"}
                    onPress={handleApply}
                    color="#03DAC5"
                />
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
    messageText: {
        color: '#E0E0E0',
        fontSize: 16,
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
        color: '#03DAC5',
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
        backgroundColor: '#03DAC5',
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
    applyForm: {
        marginTop: 20,
    },
    input: {
        height: 40,
        borderColor: '#03DAC5',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: '#E0E0E0',
    },
    applyButtonContainer: {
        marginTop: 10,
    },
});

export default JobDetail;
