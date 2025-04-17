// components/ReportsList.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
    Alert,
    ActivityIndicator,
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

    const [userReports, setUserReports] = useState<UserReport[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        getGlobalReports(token as string)
            .then(setUserReports)
            .catch(() => Alert.alert('Error', 'No se pudieron cargar reportes de usuarios.'))
            .finally(() => setLoadingUsers(false));
    }, [token]);

    const handleMarkAsRead = async (reportId: string) => {
        try {
            await markReportAsRead(reportId, token as string);
            setUserReports(prev => prev.map(r => (r.id === reportId ? { ...r, read: true } : r)));
        } catch {
            Alert.alert('Error', 'No se pudo marcar como visto.');
        }
    };

    const handleBlockUser = async (userId: string) => {
        try {
            await blockUser(userId, token as string);
            Alert.alert('Usuario bloqueado');
        } catch {
            Alert.alert('Error', 'No se pudo bloquear usuario.');
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
                <TouchableOpacity style={[styles.button, styles.danger]} onPress={() => handleBlockUser(item.reportedUser.id)}>
                    <Text style={styles.buttonText}>Bloquear</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loadingUsers) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    return (
        <ScrollView>
            <Text style={styles.header}>Reportes de Usuarios</Text>
            <FlatList
                data={userReports}
                keyExtractor={item => item.id}
                renderItem={renderUserReport}
                contentContainerStyle={styles.listContainer}
            />

            <Text style={styles.header}>Reportes de Contenido</Text>
            <ContentReportsList />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginVertical: 12,
        marginLeft: 16,
    },
    listContainer: {
        paddingBottom: 16,
    },
    card: {
        backgroundColor: '#1E1E1E',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 4,
    },
    text: {
        color: '#E0E0E0',
        marginBottom: 6,
    },
    subtitle: {
        color: '#B0B0B0',
        marginBottom: 8,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#03DAC5',
        padding: 6,
        borderRadius: 4,
    },
    danger: {
        backgroundColor: '#CF6679',
    },
    buttonText: {
        color: '#121212',
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
