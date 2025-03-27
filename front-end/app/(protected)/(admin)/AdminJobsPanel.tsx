import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getJobsByFilters, Job } from '@/services/JobsService';
import { DeleteJob } from '@/services/admin';

export default function AdminJobsPanel() {
    const { token } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [searchName, setSearchName] = useState('');
    const [loading, setLoading] = useState<boolean>(false);

    // Estados para modal de eliminación
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);
    const [deleteCode, setDeleteCode] = useState('');

    // Función para cargar trabajos; en este ejemplo uso getJobsByFilters sin filtros de tags ni ubicación
    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Ajusta los filtros según tus necesidades; aquí se pide todos los trabajos
            const data = await getJobsByFilters(
                { tags: [], longitude: -64.1888, latitude: -31.4201, radius: 1000, title: searchName },
                token as string
            );
            setJobs(data || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar los trabajos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchJobs();
    }, [token]);

    // Función para abrir el modal y asignar el jobId a eliminar
    const promptDeleteJob = (jobId: string) => {
        setJobIdToDelete(jobId);
        setDeleteCode('');
        setDeleteModalVisible(true);
    };

    // Función para confirmar eliminación enviando el código ingresado
    const confirmDeleteJob = async () => {
        if (!deleteCode.trim()) {
            Alert.alert('Error', 'Debes ingresar el código para eliminar el trabajo.');
            return;
        }
        if (!jobIdToDelete) return;
        try {
            // Si tu función DeleteJob acepta un código, se lo pasas.
            // Ejemplo: await DeleteJob(jobIdToDelete, token as string, deleteCode);
            // Si no, se puede implementar la validación en el front y llamar a DeleteJob con el jobId.
            await DeleteJob(jobIdToDelete, deleteCode, token as string);
            Alert.alert('Éxito', 'Trabajo eliminado correctamente');
            // Actualizamos el estado removiendo el trabajo eliminado
            setJobs((prev) => prev.filter((job) => job.id !== jobIdToDelete));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo eliminar el trabajo');
        } finally {
            setDeleteModalVisible(false);
            setJobIdToDelete(null);
            setDeleteCode('');
        }
    };

    // Filtrar trabajos por nombre (título)
    const filteredJobs = jobs.filter((job) =>
        job.title.toLowerCase().includes(searchName.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar trabajos por nombre..."
                placeholderTextColor="#888"
                value={searchName}
                onChangeText={setSearchName}
            />
            <FlatList
                data={filteredJobs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.jobCard}>
                        <Text style={styles.jobTitle}>{item.title}</Text>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() =>
                                Alert.alert(
                                    "Confirmar eliminación",
                                    `¿Deseas eliminar el trabajo "${item.title}"?`,
                                    [
                                        { text: "Cancelar", style: "cancel" },
                                        { text: "Eliminar", onPress: () => promptDeleteJob(item.id) },
                                    ]
                                )
                            }
                        >
                            <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={styles.listContainer}
            />

            {/* Modal para ingresar código de confirmación */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar eliminación</Text>
                        <Text style={styles.modalText}>
                            Ingresa el código de confirmación para eliminar el trabajo:
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Código de confirmación"
                            placeholderTextColor="#888"
                            value={deleteCode}
                            onChangeText={setDeleteCode}
                            keyboardType="default"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmDeleteJob}
                            >
                                <Text style={styles.modalButtonText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f2027',
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f2027',
    },
    searchInput: {
        backgroundColor: '#203a43',
        color: '#fff',
        padding: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    listContainer: {
        paddingBottom: 16,
    },
    jobCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2c5364',
    },
    jobTitle: {
        color: '#E0E0E0',
        fontSize: 16,
    },
    deleteButton: {
        backgroundColor: '#CF6679',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalInput: {
        height: 50,
        borderColor: '#444',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        color: '#E0E0E0',
        backgroundColor: '#121212',
        marginBottom: 20,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#CF6679',
    },
    confirmButton: {
        backgroundColor: '#03DAC5',
    },
    modalButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
