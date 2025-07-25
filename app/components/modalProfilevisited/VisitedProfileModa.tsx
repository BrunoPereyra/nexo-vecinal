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
    TextInput,
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
import CustomAlert from "@/components/CustomAlert";
import colors from "@/style/colors";
import { router } from 'expo-router';
import { createReports } from '@/services/admin';
import CreateJob from '../jobCards/CreateJob';

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
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportMessage, setReportMessage] = useState('');
    const [requestJobVisible, setRequestJobVisible] = useState(false);

    // ALERT STATE
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setAlertMessage(message);
        setAlertType(type);
        setAlertVisible(true);
    };

    useEffect(() => {
        if (alertVisible) {
            const timeout = setTimeout(() => setAlertVisible(false), 2500);
            return () => clearTimeout(timeout);
        }
    }, [alertVisible]);

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
                        <Ionicons name="close-circle-outline" size={32} color={colors.Black} />
                    </TouchableOpacity>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        ListHeaderComponent={ListHeader}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {activeSection === "jobFeed"
                                        ? "Este usuario no tiene trabajos realizados."
                                        : "Este usuario no tiene trabajos creados."}
                                </Text>
                            </View>
                        }
                    />
                    <TouchableOpacity
                        style={styles.reportFab}
                        onPress={() => setReportModalVisible(true)}
                    >
                        <Ionicons name="flag-outline" size={24} color={colors.textDark} />
                    </TouchableOpacity>
                    <Modal
                        visible={reportModalVisible}
                        animationType="slide"
                        transparent
                        onRequestClose={() => setReportModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Enviar Reporte</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Escribe tu reporte..."
                                    placeholderTextColor="#888"
                                    value={reportMessage}
                                    onChangeText={setReportMessage}
                                    multiline
                                />
                                <View style={styles.modalButtons}>
                                    <Button
                                        title="Enviar"
                                        onPress={async () => {
                                            if (!reportMessage.trim() || !token || !userId) {
                                                showAlert('El reporte no puede estar vacío', 'error');
                                                return;
                                            }
                                            try {
                                                const reportData = {
                                                    reportedUserId: userId,
                                                    text: reportMessage,
                                                };
                                                const res = await createReports(reportData, token);
                                                if (res && res.reporterUserId) {
                                                    showAlert('Reporte enviado exitosamente', 'success');
                                                    setReportMessage('');
                                                    setReportModalVisible(false);
                                                } else {
                                                    showAlert('No se pudo enviar el reporte', 'error');
                                                }
                                            } catch (error) {
                                                console.error('Error enviando reporte:', error);
                                                showAlert('Ocurrió un error al enviar el reporte', 'error');
                                            }
                                        }}
                                        color="#FFD700"
                                    />
                                    <Button title="Cancelar" onPress={() => setReportModalVisible(false)} color="#FFD700" />
                                </View>
                            </View>
                        </View>
                    </Modal>
                    {/* Botón flotante para abrir el chat */}
                    {
                        userProfile &&
                        <TouchableOpacity
                            style={styles.fab}
                            onPress={() =>
                                router.push(
                                    `/(protected)/(chat)/ChatScreen?employerProfile=${encodeURIComponent(
                                        JSON.stringify({ id: userProfile.id, avatar: userProfile.Avatar, nameUser: userProfile.NameUser })
                                    )}&origin=home`
                                )
                            }
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#121212" />
                        </TouchableOpacity>
                    }
                    {userProfile && (
                        <TouchableOpacity
                            style={[styles.fabWork]}
                            onPress={() => setRequestJobVisible(true)}
                        >
                            <Ionicons name="add-circle-outline" size={28} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <CreateJob
                        visible={requestJobVisible}
                        onClose={() => setRequestJobVisible(false)}
                        onJobCreated={(job) => {
                            setRequestJobVisible(false);
                            showAlert("Trabajo creado exitosamente.", "success");
                        }}
                        preselectedUser={userProfile}
                    />
                    <CustomAlert visible={alertVisible} message={alertMessage} type={alertType} />
                </View>
            </Modal>
        </>
    );
};

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
        backgroundColor: colors.warmWhite, // "#FAF9F6" 
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
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    fabWork: {
        position: "absolute",
        bottom: 170,
        right: 35,
        backgroundColor: colors.gold, // "#FFD700"
        width: 50,
        height: 50,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: colors.cream, // "#FFF8DC"
        padding: 20,
        borderRadius: 8,
        width: "80%",
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 5,
        padding: 10,
        minHeight: 80,
        marginBottom: 12,
        backgroundColor: colors.background,
        color: colors.textDark,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.primary,
        marginBottom: 12,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    reportButton: {
        position: "absolute",
        top: 60,
        right: 16,
        backgroundColor: colors.cream, // "#FFF8DC"
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.borderLight,
        zIndex: 10,
    },
    reportButtonText: {
        color: colors.textDark,
        fontWeight: "bold",
        fontSize: 14,
    },
    reportFab: {
        position: "absolute",
        bottom: 110,
        right: 36,
        backgroundColor: colors.gold,       // fondo contrastante
        width: 48,                          // tamaño fijo
        height: 48,
        borderRadius: 24,                   // círculo
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        zIndex: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        color: colors.textMuted, // Color sutil para el texto
        fontSize: 16,
        textAlign: "center",
    },
});


export default VisitedProfileModal;
