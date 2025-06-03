import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
    getGlobalReports,
    markReportAsRead,
    blockUser,
} from '@/services/admin';
import ContentReportsList from './ContentReportsList';

export type UserReport = {
    id: string;
    reportedUser: { id: string; NameUser: string; Avatar?: string };
    reporterUser: { id: string; NameUser: string; Avatar?: string };
    text: string;
    createdAt: string;
    read: boolean;
};

export default function ReportsList() {
    const router = useRouter();
    const { token } = useAuth();
    const [tab, setTab] = useState<'users' | 'content'>('users');

    // State for user reports
    const [userReports, setUserReports] = useState<UserReport[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [code, setCode] = useState('');

    useEffect(() => {
        setLoading(true);
        getGlobalReports(token as string)
            .then(setUserReports)
            .catch(() => Alert.alert('Error', 'No se pudieron cargar reportes de usuarios.'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleMarkAsRead = async (reportId: string) => {
        try {
            await markReportAsRead(reportId, token as string);
            setUserReports((prev) =>
                prev.map((r) => (r.id === reportId ? { ...r, read: true } : r))
            );
        } catch {
            Alert.alert('Error', 'No se pudo marcar como visto.');
        }
    };

    const handleBlockUser = (userId: string) => {
        setCurrentUserId(userId);
        setModalVisible(true); // Abre el modal para ingresar el código
    };

    const submitCode = async () => {
        if (!code) {
            Alert.alert('Error', 'El código no puede estar vacío.');
            return;
        }

        try {
            if (currentUserId) {
                await blockUser(currentUserId, code, token as string);
                Alert.alert('Usuario bloqueado');
                setUserReports((prev) =>
                    prev.filter((report) => report.reportedUser.id !== currentUserId)
                );
            }
        } catch {
            Alert.alert('Error', 'No se pudo bloquear usuario.');
        } finally {
            setCode('');
            setModalVisible(false); // Cierra el modal
        }
    };

    const renderUserReport = ({ item }: { item: UserReport }) => (
        <View style={styles.card}>
            <TouchableOpacity onPress={() => router.push(`/profile/ProfileVisited?id=${item.reportedUser.id}`)}>
                <Text style={styles.title}>{item.reportedUser.NameUser}</Text>
            </TouchableOpacity>
            <Text style={styles.text}>{item.text}</Text>
            <Text style={styles.subtitle}>Reportado por: {item.reporterUser.NameUser}</Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleMarkAsRead(item.id)}
                    disabled={item.read}
                >
                    <Text>{item.read ? 'Visto' : 'Marcar visto'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.danger]}
                    onPress={() => handleBlockUser(item.reportedUser.id)}
                >
                    <Text style={styles.buttonText}>Bloquear</Text>
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
            {/* Tab Selector */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'users' && styles.activeTab]}
                    onPress={() => setTab('users')}
                >
                    <Text style={[styles.tabText, tab === 'users' && styles.activeTabText]}>Usuarios</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'content' && styles.activeTab]}
                    onPress={() => setTab('content')}
                >
                    <Text style={[styles.tabText, tab === 'content' && styles.activeTabText]}>Contenido</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {tab === 'users' ? (
                <FlatList
                    data={userReports}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserReport}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.noData}>Sin reportes de usuarios.</Text>}
                />
            ) : (
                <ContentReportsList />
            )}

            {/* Modal para ingresar el código */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Bloquear Usuario</Text>
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
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabs: { flexDirection: 'row', margin: 16, borderRadius: 8, overflow: 'hidden' },
    tab: { flex: 1, paddingVertical: 10, backgroundColor: '#2C2C2C' },
    activeTab: { backgroundColor: '#03DAC5' },
    tabText: { textAlign: 'center', color: '#E0E0E0', fontWeight: 'bold' },
    activeTabText: { color: '#121212' },
    listContainer: { paddingBottom: 16 },
    card: { backgroundColor: '#1E1E1E', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#E0E0E0', marginBottom: 4 },
    text: { color: '#E0E0E0', marginBottom: 6 },
    subtitle: { color: '#B0B0B0', marginBottom: 8 },
    actions: { flexDirection: 'row', justifyContent: 'space-between' },
    button: { backgroundColor: '#03DAC5', padding: 6, borderRadius: 4 },
    danger: { backgroundColor: '#CF6679' },
    buttonText: { color: '#121212', fontWeight: 'bold' },
    noData: { textAlign: 'center', marginTop: 20, color: '#888' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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