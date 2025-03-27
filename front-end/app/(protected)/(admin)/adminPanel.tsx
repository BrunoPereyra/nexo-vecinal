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
import { getTags, addTag, removeTag } from '@/services/admin';

import ToggleTabs from './ToggleTabs';
import TagManagementPanel from './TagManagementPanel';
// Importa el nuevo panel
import AdminJobsPanel from './AdminJobsPanel';

// Agregamos "jobs" como parte de las pestañas disponibles
type AdminTab = 'reports' | 'courses' | 'support' | 'jobs';

export default function AdminPanelScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<AdminTab>('reports');
    const [courseFilter, setCourseFilter] = useState<'active' | 'inactive'>('active');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState<boolean>(false);

    const [chatDetailVisible, setChatDetailVisible] = useState<boolean>(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState<ChatUser | null>(null);

    // Gestión de Tags
    const [adminTags, setAdminTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [loadingTags, setLoadingTags] = useState<boolean>(false);

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

    const fetchTags = async () => {
        if (!token) return;
        setLoadingTags(true);
        try {
            const tagsResponse = await getTags(token as string);
            if (tagsResponse && Array.isArray(tagsResponse)) {
                setAdminTags(tagsResponse);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoadingTags(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, [token]);

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        try {
            await addTag(newTag.trim(), token as string);
            setAdminTags(prev => [...prev, newTag.trim()]);
            setNewTag('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo agregar el tag.');
        }
    };

    const handleRemoveTag = async (tag: string) => {
        try {
            await removeTag(tag, token as string);
            setAdminTags(prev => prev.filter(t => t !== tag));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo eliminar el tag.');
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
            {/* ToggleTabs con la nueva pestaña "jobs" */}
            <ToggleTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Solo mostramos los filtros y tags cuando estamos en 'courses' */}
            {activeTab === 'courses' && (
                <>
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
                    <TagManagementPanel
                        adminTags={adminTags}
                        newTag={newTag}
                        onChangeNewTag={setNewTag}
                        onAddTag={handleAddTag}
                        onRemoveTag={handleRemoveTag}
                        loadingTags={loadingTags}
                    />
                </>
            )}
        </View>
    );

    const handleConversationPress = (conversation: Conversation) => {
        setSelectedUserProfile(conversation.User);
        setChatDetailVisible(true);
    };

    return (
        <View style={styles.container}>
            <ListHeader />

            {activeTab === 'reports' ? (
                <ReportsList />
            ) : activeTab === 'courses' ? (
                <View style={{ flex: 1 }}>
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
                    <TouchableOpacity style={styles.fab} onPress={() => router.push('/cursos/CreateCourseScreen')}>
                        <Text style={styles.fabText}>+</Text>
                    </TouchableOpacity>
                </View>
            ) : activeTab === 'support' ? (
                <SupportChatsList token={token as string} onConversationPress={handleConversationPress} />
            ) : activeTab === 'jobs' ? (
                // Muestra el panel de trabajos
                <AdminJobsPanel />
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
    headerContainer: {
        marginBottom: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 16,
        textAlign: 'center',
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
    filterButtonText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeFilter: {
        backgroundColor: '#03DAC5',
    },
    activeFilterText: {
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
