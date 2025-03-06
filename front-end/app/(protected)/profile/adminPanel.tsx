// AdminPanelScreen.tsx
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
import { getActiveCourses, getCoursesPaginated, Course } from '@/services/cursos';
import ReportsList from '@/components/cursos/ReportsList';
import SupportChatsList, { Conversation, User as ChatUser } from '@/components/admin/SupportChatsList';
import SupportChatAdmin from '@/components/chatsupport/SupportChatAdmin';

export default function AdminPanelScreen() {
    const { token, logout, } = useAuth();
    const router = useRouter();

    // Pestañas: 'reports', 'courses' o 'support'
    const [activeTab, setActiveTab] = useState<'reports' | 'courses' | 'support'>('reports');
    const [courseFilter, setCourseFilter] = useState<'active' | 'inactive'>('active');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
    // Estado para abrir el chat en detalle (modal)
    const [chatDetailVisible, setChatDetailVisible] = useState<boolean>(false);
    // Almacena la información del otro usuario de la conversación seleccionada
    const [selectedUserProfile, setSelectedUserProfile] = useState<ChatUser | null>(null);

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
                const allCourses = await getCoursesPaginated(1, 100, token as string);
                const inactiveCourses = allCourses.filter(course => new Date(course.campaignEnd) <= new Date());
                setCourses(inactiveCourses);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoadingCourses(false);
        }
    };

    const renderCourseItem = ({ item }: { item: Course }) => (
        <TouchableOpacity style={styles.courseCard} onPress={() => router.push(`/cursos/${item.id}`)}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.courseStatus}>
                {courseFilter === 'active' ? 'Activo' : 'Inactivo'}
            </Text>
        </TouchableOpacity>
    );

    const ListHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.header}>Panel Administrador</Text>
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeTab === 'reports' && styles.activeToggle]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.toggleButtonText, activeTab === 'reports' && styles.activeToggleText]}>
                        Reportes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeTab === 'courses' && styles.activeToggle]}
                    onPress={() => setActiveTab('courses')}
                >
                    <Text style={[styles.toggleButtonText, activeTab === 'courses' && styles.activeToggleText]}>
                        Cursos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeTab === 'support' && styles.activeToggle]}
                    onPress={() => setActiveTab('support')}
                >
                    <Text style={[styles.toggleButtonText, activeTab === 'support' && styles.activeToggleText]}>
                        Chats de Soporte
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Cuando se toca una conversación, se guarda la info del otro usuario y se abre el modal del chat.
    const handleConversationPress = (conversation: Conversation) => {

        setSelectedUserProfile(conversation.User);
        setChatDetailVisible(true);
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    return (
        <View style={styles.container}>
            <ListHeader />
            {activeTab === 'reports' ? (
                <ReportsList />
            ) : activeTab === 'courses' ? (
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
                    <TouchableOpacity style={styles.fab} onPress={() => router.push('/CreateCourseScreen')}>
                        <Text style={styles.fabText}>+</Text>
                    </TouchableOpacity>
                </View>
            ) : activeTab === 'support' ? (
                <SupportChatsList token={token as string} onConversationPress={handleConversationPress} />
            ) : null}
            {chatDetailVisible && selectedUserProfile && (
                <SupportChatAdmin
                    visible={chatDetailVisible}
                    onClose={() => setChatDetailVisible(false)}
                    token={token as string}
                    userProfile={selectedUserProfile}
                />
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
    headerContainer: {
        marginBottom: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginVertical: 12,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#444',
    },
    toggleButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeToggle: {
        backgroundColor: '#03DAC5',
        borderColor: '#03DAC5',
    },
    activeToggleText: {
        color: '#121212',
        fontWeight: 'bold',
    },
    listContainer: {
        paddingBottom: 16,
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
    optionsButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 8,
        backgroundColor: '#1E1E1E',
        borderRadius: 30,
    },
    optionsButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
});
