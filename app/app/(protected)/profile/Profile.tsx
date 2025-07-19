import React, { useEffect, useState } from "react";
import {
    View,
    Button,
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Editbiografia, getUserToken } from "@/services/userService";
import {
    getCreateJobsProfile,
    GetJobsByUserIDForEmploye,
} from "@/services/JobsService";
import { ProfileAdminHeader } from "@/components/headersProfile/ProfileAdminHeader";
import { CreateJob } from "@/components/jobCards/CreateJob";
import { useAuth } from "@/context/AuthContext";
import SupportChat from "@/components/chatsupport/SupportChat";
import { JobCardProfiles } from "@/components/jobCards/JobCardProfiles";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import colors from "@/style/colors";
import SubscriptionSection from "@/components/Subscription/SubscriptionSection";


export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<"employer" | "jobFeed">(
        "jobFeed"
    );
    const [createJobVisible, setCreateJobVisible] = useState(false);
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageJobFeed, setCurrentPageJobFeed] = useState(1);
    const [showDropdown, setShowDropdown] = useState(false);
    const [editBioVisible, setEditBioVisible] = useState(false);
    const [biografia, setBiografia] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [workSupportVisible, setWorkSupportVisible] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    // ---------------------- Chat de Soporte ----------------------
    const [supportChatVisible, setSupportChatVisible] = useState<boolean>(false);
    // Estado para mostrar el modal del SubscriptionSection
    const [subscriptionVisible, setSubscriptionVisible] = useState(false);
    const handleSubscribe = () => {
        setSubscriptionVisible(!subscriptionVisible);
        setShowDropdown(false);
    };

    useEffect(() => {
        // quiero que guarde si el usuario titnt un data.data
        const fetchProfile = async () => {
            if (!token) {
                setError("Token no proporcionado");
                setLoading(false);
                return;
            }
            try {
                const data = await getUserToken(token);
                if (data?.data) {
                    setUserProfile(data.data);
                    setBiografia(data.data.Biography || "");
                    if (data.data.Premium) {
                        const Premium = data.data.Premium
                        if (new Date(Premium.SubscriptionEnd).getTime() > Date.now()) {
                            await AsyncStorage.setItem('userPremiumData', JSON.stringify(Premium));
                        } else {
                            await AsyncStorage.setItem('userPremiumData', JSON.stringify(Premium));
                        }
                    }
                    await AsyncStorage.setItem('workSupportVisible', data.data.availableToWork ? 'true' : 'false');
                    await AsyncStorage.setItem('availableToWork', data.data.availableToWork ? 'true' : 'false');
                    if (
                        (data.data.availableToWork === false || data.data.availableToWork === undefined) &&
                        (data.data.Intentions === "work" || data.data.Intentions === undefined)
                    ) {
                        setWorkSupportVisible(true); // Mostrar mensaje de soporte
                    } else {
                        const alreadyShown = await AsyncStorage.getItem('welcomeWorkModalShown');
                        if (!alreadyShown) {
                            setShowWelcomeModal(true);
                            await AsyncStorage.setItem('welcomeWorkModalShown', 'true');
                        }
                    }

                } else {
                    router.push('/login');
                }
            } catch (err: any) {
                setError("Error al obtener la información del usuario");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    useEffect(() => {
        AsyncStorage.setItem("activeSection", activeSection);
    }, [activeSection]);

    useEffect(() => {
        if (!token) return;
        const fetchJobFeed = async () => {
            try {
                const feedData = await GetJobsByUserIDForEmploye(1, token);
                setWorkerJobs(feedData?.jobs || []);
                setCurrentPageJobFeed(1);
            } catch (error) {
                setWorkerJobs([]);
            } finally {

                setLoading(false);
            }
        };
        const fetchEmployer = async () => {
            try {
                const feedData = await getCreateJobsProfile(1, token);
                setEmployerJobs(feedData?.jobs || []);
                setCurrentPageEmployer(1);
            } catch (error) {
                setEmployerJobs([]);
                console.error(error);
            } finally {

                setLoading(false);
            }
        };
        if (activeSection === "jobFeed") {
            fetchJobFeed();
        } else {
            fetchEmployer();
        }

    }, [activeSection, token]);

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    };

    const HandleEditbiografia = () => {
        setEditBioVisible(true);
        setShowDropdown(false);
    };

    const handleSaveBiografia = async () => {
        if (biografia.length < 10 || biografia.length > 100) {
            Alert.alert("Error", "La biografía debe tener entre 10 y 100 caracteres.");
            return;
        }
        await Editbiografia(biografia, token as string);
        setEditBioVisible(false);
    };


    const handleLogoutOption = () => {
        setShowDropdown(false);
        handleLogout();
    };

    const loadMoreEmployerJobs = async () => {

        if (!token) return;
        const nextPage = currentPageEmployer + 1;
        try {
            const newData = await getCreateJobsProfile(nextPage, token);
            if (newData?.jobs) {
                setEmployerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageEmployer(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadMoreJobFeed = async () => {
        if (!token) return;
        const nextPage = currentPageJobFeed + 1;
        try {
            const newData = await GetJobsByUserIDForEmploye(nextPage, token);
            if (newData?.jobs) {
                setWorkerJobs((prev) => [...prev, ...newData.jobs]);
                setCurrentPageJobFeed(nextPage);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Encabezado de la lista (header) con más espacio entre el header y los toggles
    const ListHeader = () => (
        <View style={styles.headerContainer}>
            {userProfile && <ProfileAdminHeader user={userProfile} />}
            {/* Más espacio para separar la biografía de los toggles */}
            <View style={styles.toggleContainer}>
                {/* Toggle "Trabajos realizados" */}
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        activeSection === "jobFeed" && styles.activeToggle,
                    ]}
                    onPress={() => setActiveSection("jobFeed")}
                >
                    <MaterialIcons
                        name="done-all"
                        size={20}
                        color={activeSection === "jobFeed" ? "#121212" : "#E0E0E0"}
                        style={styles.toggleIcon}
                    />
                    <Text
                        style={[
                            styles.toggleButtonText,
                            activeSection === "jobFeed" && styles.activeToggleText,
                        ]}
                    >
                        Trabajos realizados
                    </Text>
                </TouchableOpacity>

                {/* Toggle "Trabajos creados" */}
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        activeSection === "employer" && styles.activeToggle,
                    ]}
                    onPress={() => setActiveSection("employer")}
                >
                    <MaterialIcons
                        name="work-outline"
                        size={20}
                        color={activeSection === "employer" ? "#121212" : "#E0E0E0"}
                        style={styles.toggleIcon}
                    />
                    <Text
                        style={[
                            styles.toggleButtonText,
                            activeSection === "employer" && styles.activeToggleText,
                        ]}
                    >
                        Trabajos creados
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Un poco más de espacio antes de la lista de trabajos */}
            <View style={{ marginBottom: 8 }} />
        </View>
    );

    const data = activeSection === "employer" ? employerJobs : workerJobs;

    const renderItem = ({ item }: { item: any }) => {
        return <JobCardProfiles item={item} activeSection={activeSection} />;
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Cerrar sesión" onPress={handleLogout} color="#03DAC5" />
            </View>
        );
    }

    if (loading || !userProfile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#03DAC5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
                keyExtractor={(item) => item?.id.toString()}
                renderItem={renderItem}
                onEndReached={
                    activeSection === "employer" ? loadMoreEmployerJobs : loadMoreJobFeed
                }
                onEndReachedThreshold={0.5}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#03DAC5" />
                        ) : (
                            <Text style={styles.emptyText}>
                                {activeSection === "jobFeed"
                                    ? "Aquí aparecerán tus trabajos realizados"
                                    : "Aquí aparecerán tus trabajos creados"}
                            </Text>
                        )}
                    </View>
                }
            />

            {/* Botón de opciones en la esquina superior derecha */}
            <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <MaterialIcons name="more-vert" size={24} color="#33333" />
            </TouchableOpacity>
            {showDropdown && (
                <View style={styles.dropdown}>
                    <TouchableOpacity
                        onPress={HandleEditbiografia}
                        style={styles.dropdownButton}
                    >
                        <Text style={styles.dropdownButtonText}>Cambiar descripción</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleSubscribe}
                        style={styles.dropdownButton}
                    >
                        <Text style={styles.dropdownButtonText}>Preferencias</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setShowDropdown(false);
                            setSupportChatVisible(true);
                        }}
                        style={styles.dropdownButton}
                    >
                        <Text style={styles.dropdownButtonText}>Chat de Soporte</Text>
                    </TouchableOpacity>
                    {/* <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.dropdownButtonText}>agrega curso</Text>
                    </TouchableOpacity> */}
                    {userProfile?.PanelAdminNexoVecinal?.Level > 0 && (
                        <TouchableOpacity
                            onPress={() => router.push("/(protected)/(admin)/adminPanel")}
                            style={styles.dropdownButton}
                        >
                            <Text style={styles.dropdownButtonText}>Administrador</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={handleLogoutOption}
                        style={[styles.dropdownButton, styles.dropdownLogout]}
                    >
                        <Text style={styles.dropdownButtonText}>Cerrar sesión</Text>
                    </TouchableOpacity>

                </View>
            )}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >

                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentmail}>
                        <Text style={styles.modalTitlemail}>Agregar Curso</Text>
                        <Text style={styles.modalText}>
                            Para agregar tu curso, envía un email a:
                        </Text>
                        <View style={styles.emailContainer}>
                            <Text style={styles.modalEmail}>nexovecinal@gmail.com</Text>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={async () => {
                                    await Clipboard.setStringAsync("nexovecinal@gmail.com");
                                    Alert.alert("Copiado", "El email se ha copiado al portapapeles.");
                                }}
                            >
                                <Text style={styles.copyButtonText}>Copiar</Text>
                            </TouchableOpacity>
                        </View>
                        <Button title="Cerrar" onPress={() => setModalVisible(false)} color="#03DAC5" />
                    </View>
                </View>
            </Modal>
            {/* Modal para editar biografía */}
            <Modal visible={editBioVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Biografía</Text>
                        <TextInput
                            style={styles.modalTextInput}
                            placeholder="Ingresa tu biografía (10-100 caracteres)"
                            placeholderTextColor="#888"
                            value={biografia}
                            onChangeText={setBiografia}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancelar"
                                onPress={() => setEditBioVisible(false)}
                                color="#CF6679"
                            />
                            <Button
                                title="Guardar"
                                onPress={handleSaveBiografia}
                                color="#03DAC5"
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            {workSupportVisible && (
                <View style={styles.supportMessage}>
                    <Text style={styles.supportText}>
                        Para habilitar la posibilidad de trabajo, por favor contacta con soporte.
                    </Text>
                    <TouchableOpacity
                        style={styles.supportButton}
                        onPress={() => setSupportChatVisible(true)}
                    >
                        <Text style={styles.supportButtonText}>Hablar con soporte</Text>
                    </TouchableOpacity>
                </View>
            )}
            <Modal
                visible={showWelcomeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWelcomeModal(false)}
            >
                <View style={styles.modalOverlayWelcomeModal}>
                    <View style={styles.modalContentWelcomeModal}>
                        <Text style={styles.modalTitle}>¡Bienvenido!</Text>
                        <Text style={styles.modalText}>
                            Todos los trabajadores de la app pasaron por un proceso de prueba antes de poder disponer de la habilidad de trabajar.
                        </Text>
                        <Button
                            title="Entendido"
                            onPress={() => setShowWelcomeModal(false)}
                            color="#03DAC5"
                        />
                    </View>
                </View>
            </Modal>
            {/* Modal de Chat de Soporte */}
            {userProfile && (
                <SupportChat
                    visible={supportChatVisible}
                    onClose={() => setSupportChatVisible(false)}
                    token={token as string}
                    userProfile={userProfile}
                />
            )}
            {/* Sección de suscripción */}
            <Modal
                visible={subscriptionVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSubscriptionVisible(false)} // Cierra el modal al presionar atrás
            >
                <Button
                    title="Cerrar"
                    onPress={() => setSubscriptionVisible(false)}
                    color={colors.errorRed}
                />
                <View style={styles.modalOverlaySubscription}>
                    <View style={styles.modalContentSubscription}>
                        <SubscriptionSection averageRating={4} jobsCompleted={24} />

                    </View>
                </View>
            </Modal>

            {/* FAB para crear trabajo */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setCreateJobVisible(true)}
            >
                <MaterialIcons name="add" size={32} color="#121212" />
            </TouchableOpacity>

            {/* Modal de creación de trabajo */}
            <CreateJob
                visible={createJobVisible}
                onClose={() => setCreateJobVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // "#FFFFFF"
    },
    listContainer: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: colors.warmWhite, // "#FAF9F6"
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.warmWhite,
    },
    errorText: {
        color: colors.errorRed, // "#CF6679"
        marginBottom: 20,
        fontSize: 16,
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 8,
    },
    toggleContainer: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        marginVertical: 12,
        marginHorizontal: 8,
    },
    toggleButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
        marginHorizontal: 4,
        flexShrink: 1,
    },
    toggleIcon: {
        marginRight: 6,
    },

    activeToggleText: {
        color: colors.textDark, // "#333"
        fontWeight: "bold",
    },
    toggleButtonText: {
        fontSize: 14,
        color: colors.textDark, // "#333"
    },
    activeToggle: {
        backgroundColor: colors.gold, // "#FFD700"
        borderColor: colors.gold, // "#FFD700"
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        color: colors.textDark,
        fontSize: 16,
        textAlign: "center",
    },
    optionsButton: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 8,
        backgroundColor: colors.cream,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        zIndex: 100,
    },
    dropdown: {
        position: "absolute",
        top: 50,
        right: 10,
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        zIndex: 99,
    },
    dropdownButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    dropdownButtonText: {
        color: colors.textDark,
        fontSize: 16,
    },
    dropdownLogout: {
        borderTopWidth: 1,
        borderColor: colors.borderLight,
        marginTop: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: colors.cream,
        borderRadius: 12,
        padding: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 16,
    },
    modalTextInput: {
        height: 100,
        borderColor: colors.borderLight,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        color: colors.textDark,
        backgroundColor: colors.background,
        textAlignVertical: "top",
        marginBottom: 20,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    fab: {
        position: "absolute",
        bottom: 90,
        right: 12,
        backgroundColor: colors.borderLight,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    addCourseButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignSelf: "center",
        marginTop: 16,
    },
    addCourseButtonText: {
        color: colors.textDark,
        fontSize: 16,
        fontWeight: "bold",
    },
    modalOverlayWelcomeModal: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContentWelcomeModal: {
        width: "85%",
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlaySubscription: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContentSubscription: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        margin: 20
    },

    modalContentmail: {
        width: "80%",
        backgroundColor: colors.cream,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalTitlemail: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.primary,
        marginBottom: 12,
        textAlign: "center",
    },
    modalText: {
        fontSize: 16,
        color: colors.textDark,
        textAlign: "center",
        marginBottom: 8,
    },
    emailContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalEmail: {
        fontSize: 18,
        color: colors.textDark,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },
    copyButton: {
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 12,
        borderRadius: 8,
    },
    copyButtonText: {
        color: colors.textDark,
        fontSize: 16,
        fontWeight: "bold",
    },
    supportMessage: {
        backgroundColor: colors.borderLight,
        padding: 16,
        margin: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FFEEBA",
    },
    supportText: {
        color: colors.textDark,
        fontSize: 16,
        marginBottom: 8,
    },
    supportButton: {
        backgroundColor: colors.ColorPrice,
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
    },
    supportButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
});

