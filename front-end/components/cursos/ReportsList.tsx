// components/ReportsList.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getGlobalReports, markReportAsRead, blockUser } from '@/services/admin';

export type Report = {
    id: string;
    reportedUser: {
        id: string;
        NameUser: string;
        Avatar?: string;
    };
    reporterUser: {
        id: string;
        NameUser: string;
        Avatar?: string;
    };
    text: string;
    createdAt: string;
    read: boolean;
};

export default function ReportsList() {
    const router = useRouter();
    const { token } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await getGlobalReports(token as string);
                setReports(data);
            } catch (error) {
                Alert.alert('Error', 'No se pudieron cargar los reportes.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [token]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    // Función para marcar reporte como visto
    const handleMarkAsRead = async (reportId: string) => {
        try {
            await markReportAsRead(reportId, token as string);
            Alert.alert('Éxito', 'Reporte marcado como visto.');
            // Actualiza el estado local para reflejar que el reporte ya se vio
            setReports(prevReports =>
                prevReports.map(report =>
                    report.id === reportId ? { ...report, read: true } : report
                )
            );
        } catch (error) {
            Alert.alert('Error', 'No se pudo marcar como visto el reporte.');
        }
    };

    // Función para bloquear al usuario reportado
    const handleBlockUser = async (userId: string) => {
        try {
            await blockUser(userId, token as string);
            Alert.alert('Éxito', 'Usuario bloqueado.');
        } catch (error) {
            Alert.alert('Error', 'No se pudo bloquear al usuario.');
        }
    };

    const renderReportItem = ({ item }: { item: Report }) => (
        <View style={styles.reportCard}>
            <TouchableOpacity onPress={() => router.push(`/ProfileVisited?id=${item.reportedUser.id}`)}>
                <Text style={styles.reportUser}>{item.reportedUser.NameUser}</Text>
            </TouchableOpacity>
            <Text style={styles.reportText}>{item.text}</Text>
            <Text style={styles.reportSubtitle}>
                Reportado por: {item.reporterUser.NameUser}
            </Text>
            <View style={styles.reportActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkAsRead(item.id)}
                    disabled={item.read}
                >
                    <Text style={styles.actionButtonText}>{item.read ? 'Visto' : 'Marcar como Visto'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.denegarButton]} onPress={() => handleBlockUser(item.reportedUser.id)}
                >
                    <Text style={styles.actionButtonText}>Bloquear</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderReportItem}
            contentContainerStyle={styles.listContainer}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingBottom: 16,
    },
    reportCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    reportUser: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginBottom: 4,
    },
    reportText: {
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 8,
    },
    reportSubtitle: {
        fontSize: 14,
        color: '#B0B0B0',
        marginBottom: 8,
    },
    reportActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    denegarButton: {
        backgroundColor: '#CF6679',
    },
    actionButtonText: {
        color: '#121212',
        fontWeight: 'bold',
    },
});
