// components/ContentReportsList.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getContentReports } from '@/services/reports';
import { ContentReport, DeleteJob, DeletePost, deleteContentReport } from '@/services/admin';



export default function ContentReportsList() {
    const { token } = useAuth();
    const [contentReports, setContentReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getContentReports(1, 50, token as string)
            .then((d) => {
                if (d.data?.length > 0) {
                    console.log('d.data', d.data);

                    setContentReports(d.data);
                } else {
                    setContentReports([]);
                }
            })
            .catch(() => setContentReports([]))
            .finally(() => setLoading(false));
    }, [token]);

    const handleDelete = async (item: ContentReport) => {
        try {
            const method = item.contentType === 'post' ? DeletePost : DeleteJob;
            await method(item.reportedContentId, 'bruno', token as string);
            Alert.alert('Contenido eliminado');
        } catch (err) {
            Alert.alert('Error al eliminar contenido');
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            const res = await deleteContentReport(id, 'bruno', token as string);
            console.log(res);

            Alert.alert('Marcado como visto');
        } catch (err) {
            Alert.alert('Error al marcar como visto');
        }
    };

    const renderContentReport = ({ item }: { item: ContentReport }) => (
        <View style={styles.card}>
            <Text style={styles.text}>Tipo: {item.contentType}</Text>
            <Text style={styles.text}>ID Contenido: {item.reportedContentId}</Text>
            {Array.isArray(item.reports) && item.reports.map((report, idx) => (
                <View key={idx}>
                    <Text style={styles.text}>Motivo: {report.description}</Text>
                </View>
            ))}


            <View style={styles.actions}>
                <TouchableOpacity style={[styles.button, styles.danger]} onPress={() => handleDelete(item)}>
                    <Text style={styles.buttonText}>Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleMarkAsRead(item.id)}>
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
        <FlatList
            data={contentReports}
            keyExtractor={item => item.id}
            renderItem={renderContentReport}
            contentContainerStyle={styles.listContainer}
        />
    );
}

const styles = StyleSheet.create({
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
    subtitle: {
        color: '#B0B0B0',
        fontSize: 12,
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
});
