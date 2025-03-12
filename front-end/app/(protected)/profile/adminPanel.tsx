import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getActiveCourses, getCoursesPaginated, Course } from '@/services/cursos';
import ReportsList from '@/components/cursos/ReportsList';
import SupportChatsList, { Conversation, User as ChatUser } from '@/components/admin/SupportChatsList';
import SupportChatAdmin from '@/components/chatsupport/SupportChatAdmin';
import { getTags, addTag, removeTag } from '@/services/admin';

export default function AdminPanelScreen() {
    const { token, logout } = useAuth();
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

    // Estados para gestión de tags
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

    // Cargar tags desde el servicio
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

    // Función para agregar un tag
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

    // Función para eliminar un tag
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
            {/* Sección de Gestión de Tags (solo visible en el panel admin) */}
            <View style={styles.tagsManagementContainer}>
                <Text style={styles.sectionHeader}>Gestión de Tags</Text>
                {loadingTags ? (
                    <ActivityIndicator color="#03DAC5" />
                ) : (
                    <View style={styles.tagsList}>
                        {adminTags.map((tag, index) => (
                            <View key={index} style={styles.tagItem}>
                                <Text style={styles.tagText}>{tag}</Text>
                                <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.removeTagButton}>
                                    <Text style={styles.removeTagText}>X</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
                <View style={styles.addTagContainer}>
                    <TextInput
                        style={styles.inputTag}
                        placeholder="Nuevo tag"
                        placeholderTextColor="#888"
                        value={newTag}
                        onChangeText={setNewTag}
                    />
                    <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                        <Text style={styles.addTagButtonText}>Agregar</Text>
                    </TouchableOpacity>
                </View>
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
                    <TouchableOpacity style={styles.fab} onPress={() => router.push('/cursos/CreateCourseScreen')}>
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
    // Estilos para gestión de Tags
    tagsManagementContainer: {
        marginBottom: 16,
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 8,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginBottom: 8,
        textAlign: 'center',
    },
    tagsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121212',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#03DAC5',
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 12,
        color: '#E0E0E0',
        marginRight: 4,
    },
    removeTagButton: {
        backgroundColor: '#BB86FC',
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    removeTagText: {
        color: '#121212',
        fontSize: 10,
        fontWeight: 'bold',
    },
    addTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputTag: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#03DAC5',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#121212',
        color: '#E0E0E0',
        marginRight: 8,
    },
    addTagButton: {
        backgroundColor: '#03DAC5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addTagButtonText: {
        color: '#121212',
        fontWeight: 'bold',
    },
});
