import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getContentReports } from '@/services/reports';
import { ContentReport, DeleteJob, DeletePost, deleteContentReport } from '@/services/admin';

export default function ContentReportsList() {
    const { token } = useAuth();
    const [contentReports, setContentReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentAction, setCurrentAction] = useState<'delete' | 'markAsRead' | null>(null);
    const [currentReport, setCurrentReport] = useState<ContentReport | null>(null);
    const [code, setCode] = useState('');

    useEffect(() => {
        getContentReports(1, 50, token as string)
            .then((d) => {
                if (d.data?.length > 0) {
                    setContentReports(d.data);
                } else {
                    setContentReports([]);
                }
            })
            .catch(() => setContentReports([]))
            .finally(() => setLoading(false));
    }, [token]);

    const openModal = (action: 'delete' | 'markAsRead', report: ContentReport) => {
        setCurrentAction(action);
        setCurrentReport(report);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setCode('');
        setCurrentAction(null);
        setCurrentReport(null);
    };

    const submitCode = async () => {
        if (!code) {
            Alert.alert('Error', 'El código no puede estar vacío.');
            return;
        }

        try {
            if (currentAction === 'delete' && currentReport) {
                const method = currentReport.contentType === 'post' ? DeletePost : DeleteJob;
                await method(currentReport.reportedContentId, code, token as string);
                Alert.alert('Contenido eliminado');
            } else if (currentAction === 'markAsRead' && currentReport) {
                await deleteContentReport(currentReport.id, code, token as string);
                Alert.alert('Marcado como visto');
            }

            // Refrescar la lista después de la acción
            setContentReports((prev) =>
                prev.filter((report) => report.id !== currentReport?.id)
            );
        } catch (err) {
            Alert.alert('Error', 'No se pudo completar la acción.');
        } finally {
            closeModal();
        }
    };

    const renderContentReport = ({ item }: { item: ContentReport }) => (
        <View style={styles.card}>
            <Text style={styles.text}>Tipo: {item.contentType}</Text>
            <Text style={styles.text}>ID Contenido: {item.reportedContentId}</Text>
            {Array.isArray(item.reports) &&
                item.reports.map((report, idx) => (
                    <View key={idx}>
                        <Text style={styles.text}>Motivo: {report.description}</Text>
                    </View>
                ))}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.danger]}
                    onPress={() => openModal('delete', item)}
                >
                    <Text style={styles.buttonText}>Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => openModal('markAsRead', item)}
                >
                    <Text style={styles.buttonText}>Marcar como visto</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={contentReports}
                keyExtractor={(item) => item.id}
                renderItem={renderContentReport}
                contentContainerStyle={styles.listContainer}
            />
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {currentAction === 'delete'
                                ? 'Eliminar Contenido'
                                : 'Marcar como Visto'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Introduce el código"
                            placeholderTextColor="#B0B0B0"
                            value={code}
                            onChangeText={setCode}
                        />
                        <TouchableOpacity style={styles.submitButton} onPress={submitCode}>
                            <Text style={styles.buttonText}>Aceptar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    listContainer: {
        paddingBottom: 16,
    },
    card: {
        backgroundColor: '#2C2C2C',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
    },
    text: {
        color: '#E0E0E0',
        marginBottom: 6,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#03DAC5',
        padding: 6,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    danger: {
        backgroundColor: '#CF6679',
    },
    buttonText: {
        color: '#121212',
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#2C2C2C',
        color: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#03DAC5',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: '#CF6679',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
});