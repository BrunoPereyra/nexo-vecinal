import React, { useEffect, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { getUserByid } from '@/services/userService';
import { ProfileVisitedHeader } from '@/components/headersProfile/ProfileVisitedHeader';
import {
    GetJobsUserIDForEmployeProfilevist,
    GetJobsUserCompleted,
} from '@/services/JobsService';
import { JobCardProfiles } from '../jobCards/JobCardProfiles';
import { Ionicons } from '@expo/vector-icons';

interface VisitedProfileModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
}

const VisitedProfileModal: React.FC<VisitedProfileModalProps> = ({ visible, onClose, userId }) => {
    const { token, logout } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'employer' | 'jobFeed'>('jobFeed');
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageWorker, setCurrentPageWorker] = useState(1);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const fetchProfile = async () => {
            if (!token) {
                setError('Token no proporcionado');
                setGlobalLoading(false);
                return;
            }
            try {
                const cachedSection = await AsyncStorage.getItem('activeSection');
                if (cachedSection === 'jobFeed' || cachedSection === 'employer') {
                    setActiveSection(cachedSection as 'jobFeed' | 'employer');
                }
                const data = await getUserByid(userId);
                if (data?.data) {
                    setUserProfile(data.data);
                }
            } catch (err: any) {
                setError('Error al obtener la información del usuario');
                console.error(err);
            } finally {
                setGlobalLoading(false);
            }
        };
        fetchProfile();
    }, [token, userId, visible]);

    useEffect(() => {
        AsyncStorage.setItem('activeSection', activeSection);
    }, [activeSection]);

    useEffect(() => {
        if (!token) return;
        if (activeSection === 'jobFeed' && workerJobs.length === 0) {
            GetJobsUserCompleted(userId)
                .then((jobsData) => {
                    setWorkerJobs(jobsData?.data || []);
                    setCurrentPageWorker(1);
                })
                .catch((error) => console.error(error));
        }
    }, [activeSection, token, userId]);

    useEffect(() => {
        if (!token) return;
        if (activeSection === 'employer' && employerJobs.length === 0) {
            GetJobsUserIDForEmployeProfilevist(1, userId)
                .then((feedData) => {
                    setEmployerJobs(feedData?.jobs || []);
                    setCurrentPageEmployer(1);
                })
                .catch((error) => console.error(error));
        }
    }, [activeSection, token, userId]);

    const loadMoreEmployerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await GetJobsUserIDForEmployeProfilevist(nextPage, userId);
            if (newData?.jobs) {
                setEmployerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageEmployer(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadMoreWorkerJobs = async () => {
        if (!token) return;
        const nextPage = currentPageWorker + 1;
        try {
            const newData = await GetJobsUserCompleted(userId);
            if (newData?.jobs) {
                setWorkerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageWorker(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (globalLoading) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#03DAC5" />
                </View>
            </Modal>
        );
    }

    if (error) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button
                        title="Cerrar sesión"
                        onPress={async () => {
                            await logout();
                        }}
                        color="#03DAC5"
                    />
                    <Button title="Cerrar" onPress={onClose} color="#03DAC5" />
                </View>
            </Modal>
        );
    }

    const ListHeader = () => (
        <View>
            {userProfile && <ProfileVisitedHeader user={userProfile} />}
            {userProfile?.description && (
                <View style={styles.descriptionContainer}>
                    <Text style={styles.userDescription}>
                        {descriptionExpanded || userProfile.description.length <= 100
                            ? userProfile.description
                            : `${userProfile.description.substring(0, 100)}... `}
                    </Text>
                    {userProfile.description.length > 100 && (
                        <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
                            <Text style={styles.seeMoreText}>
                                {descriptionExpanded ? 'Ver menos' : 'Ver más'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'jobFeed' && styles.activeToggle]}
                    onPress={() => setActiveSection('jobFeed')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'jobFeed' && styles.activeToggleText]}>
                        Trabajos realizados
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === 'employer' && styles.activeToggle]}
                    onPress={() => setActiveSection('employer')}
                >
                    <Text style={[styles.toggleButtonText, activeSection === 'employer' && styles.activeToggleText]}>
                        Trabajos creados
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const data = activeSection === 'jobFeed' ? workerJobs : employerJobs;
    const onEndReached = activeSection === 'jobFeed' ? loadMoreWorkerJobs : loadMoreEmployerJobs;

    const renderItem = ({ item }: { item: any }) => {
        return <JobCardProfiles item={item} activeSection={activeSection} />;
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close-circle-outline" size={32} color="#03DAC5" />
                    </TouchableOpacity>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListHeaderComponent={ListHeader}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={styles.listContainer}
                    />
                    {/* Botón flotante para abrir el chat */}
                    {/* {
                        userProfile &&
                        <TouchableOpacity
                            style={styles.fab}
                            onPress={() =>
                                router.push(
                                    `/(protected)/(chat)/ChatScreen?employerProfile=${encodeURIComponent(
                                        JSON.stringify({ id: userProfile.id, avatar: userProfile.Avatar, nameUser: userProfile.NameUser })
                                    )}&origin=profileVisited`
                                )
                            }
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#121212" />
                        </TouchableOpacity>
                    } */}
                </View>
            </Modal>
        </>
    );
};
import colors from "@/style/colors";

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: colors.warmWhite, // "#FAF9F6"
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    closeButtonText: {
        fontSize: 24,
        color: colors.gold, // "#FFD700"
    },
    listContainer: {
        flexGrow: 1,
        padding: 6,
        backgroundColor: colors.warmWhite, // "#FAF9F6"
        paddingTop: 10,
    },
    center: {
        flex: 1,
        backgroundColor: colors.warmWhite, // "#FAF9F6"
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: colors.errorRed,
        fontSize: 16,
        marginBottom: 20,
    },
    descriptionContainer: {
        backgroundColor: colors.cream, // "#FFF8DC"
        padding: 8,
        borderRadius: 5,
        marginBottom: 10,
    },
    userDescription: {
        fontSize: 16,
        color: colors.textDark, // "#333"
    },
    seeMoreText: {
        fontSize: 14,
        color: colors.gold, // "#FFD700"
        marginTop: 4,
        textDecorationLine: "underline",
    },
    toggleContainer: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        marginVertical: 12,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: colors.cream, // "#FFF8DC"
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    toggleButtonText: {
        fontSize: 16,
        color: colors.textDark, // "#333"
    },
    activeToggle: {
        backgroundColor: colors.gold, // "#FFD700"
        borderColor: colors.gold, // "#FFD700"
    },
    activeToggleText: {
        color: colors.textDark, // "#333"
        fontWeight: "bold",
    },
    fab: {
        position: "absolute",
        bottom: 30,
        right: 30,
        backgroundColor: colors.gold, // "#FFD700"
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    fabText: {
        color: colors.textDark, // "#333"
        fontSize: 30,
        fontWeight: "bold",
    },
});


export default VisitedProfileModal;
