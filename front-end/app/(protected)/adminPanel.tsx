// app/(protected)/adminPanel.tsx
import React, { useState, useEffect } from 'react';
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
import {
    getActiveCourses,
    getCoursesPaginated,
    Course,
} from '@/services/cursos';

const dummyReports = [
    {
        id: 'r1',
        reportedUser: { id: '67bca2dae44c7e18c6691302', fullName: 'Bruno' },
        reportText: 'Incumplimiento de normas en la plataforma.',
    },
    {
        id: 'r2',
        reportedUser: { id: '67bca3c1e44c7e18c6691304', fullName: 'Ezequiel' },
        reportText: 'Contenido inapropiado en su publicación.',
    },
    // Más reportes de ejemplo...
];

export default function AdminPanelScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'reports' | 'courses'>('reports');
    const [courseFilter, setCourseFilter] = useState<'active' | 'inactive'>('active');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState<boolean>(false);

    useEffect(() => {
        if (activeTab === 'courses') {
            fetchCourses();
        }
    }, [courseFilter, token, activeTab]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            if (courseFilter === 'active') {
                const activeCourses = await getActiveCourses(token as string);
                setCourses(activeCourses);
            } else {
                // Obtenemos cursos paginados y filtramos los que ya finalizaron su campaña
                const allCourses = await getCoursesPaginated(1, 100, token as string);
                const inactiveCourses = allCourses.filter(
                    course => new Date(course.campaignEnd) <= new Date()
                );
                setCourses(inactiveCourses);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoadingCourses(false);
        }
    };

    const renderReportItem = ({ item }: { item: typeof dummyReports[0] }) => (
        <View style={styles.reportCard}>
            <TouchableOpacity onPress={() => router.push(`/ProfileVisited?id=${item.reportedUser.id}`)}>
                <Text style={styles.reportUser}>{item.reportedUser.fullName}</Text>
            </TouchableOpacity>
            <Text style={styles.reportText}>{item.reportText}</Text>
            <View style={styles.reportActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Sancionado', `Usuario ${item.reportedUser.fullName} sancionado`)}
                >
                    <Text style={styles.actionButtonText}>Sancionar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.denegarButton]}
                    onPress={() => Alert.alert('Denegado', `Reporte de ${item.reportedUser.fullName} denegado`)}
                >
                    <Text style={styles.actionButtonText}>Denegar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCourseItem = ({ item }: { item: Course }) => (
        <TouchableOpacity style={styles.courseCard} onPress={() => router.push(`/cursos/${item.id}`)}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.courseStatus}>
                {courseFilter === 'active' ? 'Activo' : 'Inactivo'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Panel Administrador</Text>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'reports' && styles.activeTab]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'reports' && styles.activeTabText]}>
                        Reportes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'courses' && styles.activeTab]}
                    onPress={() => setActiveTab('courses')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'courses' && styles.activeTabText]}>
                        Cursos
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'reports' ? (
                <FlatList
                    data={dummyReports}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReportItem}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={[styles.filterButton, courseFilter === 'active' && styles.activeFilter]}
                            onPress={() => setCourseFilter('active')}
                        >
                            <Text style={[styles.filterButtonText, courseFilter === 'active' && styles.activeFilterText]}>
                                Activos
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, courseFilter === 'inactive' && styles.activeFilter]}
                            onPress={() => setCourseFilter('inactive')}
                        >
                            <Text style={[styles.filterButtonText, courseFilter === 'inactive' && styles.activeFilterText]}>
                                Inactivos
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {loadingCourses ? (
                        <ActivityIndicator size="large" color="#03DAC5" />
                    ) : (
                        <FlatList
                            data={courses}
                            keyExtractor={(item) => item.id}
                            renderItem={renderCourseItem}
                            contentContainerStyle={styles.listContainer}
                        />
                    )}
                    {/* Botón flotante que redirige a la pantalla de creación de curso */}
                    <TouchableOpacity style={styles.fab} onPress={() => router.push('/CreateCourseScreen')}>
                        <Text style={styles.fabText}>+</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 16,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#1E1E1E',
        marginHorizontal: 8,
    },
    activeTab: {
        backgroundColor: '#03DAC5',
    },
    tabButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeTabText: {
        color: '#121212',
        fontWeight: 'bold',
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
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#1E1E1E',
        marginHorizontal: 8,
    },
    activeFilter: {
        backgroundColor: '#03DAC5',
    },
    filterButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeFilterText: {
        color: '#121212',
        fontWeight: 'bold',
    },
    courseCard: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 4,
    },
    courseStatus: {
        fontSize: 14,
        color: '#B0B0B0',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#03DAC5',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: {
        fontSize: 28,
        color: '#121212',
        fontWeight: 'bold',
    },
});
