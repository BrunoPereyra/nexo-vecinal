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
    const [loadingJobs, setLoadingJobs] = useState(false);

    // ---------------------- Chat de Soporte ----------------------
    const [supportChatVisible, setSupportChatVisible] = useState<boolean>(false);
    // -------------------------------------------------------------

    useEffect(() => {

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
                }
            } catch (err: any) {
                setError("Error al obtener la información del usuario");
                console.error(err);
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
        setLoadingJobs(true);
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

    const handleSubscribe = () => {
        Alert.alert("Subscribirse", "Función no implementada.");
        setShowDropdown(false);
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
            <View style={{ marginTop: 10 }} />
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
                        {loadingJobs ? (
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
                <MaterialIcons name="more-vert" size={24} color="#E0E0E0" />
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
                        <Text style={styles.dropdownButtonText}>Subscribirse</Text>
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
                    {userProfile?.PanelAdminNexoVecinal?.Level > 0 && (
                        <TouchableOpacity
                            onPress={() => router.push("/profile/adminPanel")}
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

            {/* Modal de Chat de Soporte */}
            {userProfile && (
                <SupportChat
                    visible={supportChatVisible}
                    onClose={() => setSupportChatVisible(false)}
                    token={token as string}
                    userProfile={userProfile}
                />
            )}

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
    // 1. Unificar la paleta en el contenedor principal
    container: {
        flex: 1,
        backgroundColor: "#0f2027",
    },
    // 2. Agregar más espacios y separaciones
    listContainer: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: '#0f2027',
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0f2027",
    },
    errorText: {
        color: "#CF6679",
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
        backgroundColor: "#203a43",
        borderWidth: 1,
        borderColor: "#2c5364",
        marginHorizontal: 4, // Menos margen lateral
        flexShrink: 1, // Permite que se encoja si es necesario
    },
    toggleIcon: {
        marginRight: 6,
    },
    // 3. Contraste de texto asegurado (color claro vs. fondo oscuro)
    toggleButtonText: {
        fontSize: 14,
        flexShrink: 1,
        color: "#E0E0E0",
        textAlign: "center",
    },
    // 4. Consistencia de botones: usar #03DAC5 como color de acento en toggles activos
    activeToggle: {
        backgroundColor: "#03DAC5",
        borderColor: "#03DAC5",
    },
    activeToggleText: {
        color: "#121212",
        fontWeight: "bold",
    },
    // 5. Pequeños detalles de estilo
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        color: "#E0E0E0",
        fontSize: 16,
        textAlign: "center",
    },
    optionsButton: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 8,
        backgroundColor: "#203a43",
        borderRadius: 30,
        elevation: 5,
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
        backgroundColor: "#203a43",
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
        color: "#E0E0E0",
        fontSize: 16,
    },
    dropdownLogout: {
        borderTopWidth: 1,
        borderColor: "#444",
        marginTop: 8,
    },
    // 6. Biografía / Descripción con más espacio en el header (hecho en ListHeader con marginTop)
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: "#203a43",
        borderRadius: 12,
        padding: 20,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#E0E0E0",
        marginBottom: 16,
    },
    modalTextInput: {
        height: 100,
        borderColor: "#2c5364",
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        color: "#E0E0E0",
        backgroundColor: "#0f2027",
        textAlignVertical: "top",
        marginBottom: 20,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    // FAB unificado con el color de acento
    fab: {
        position: "absolute",
        bottom: 30,
        right: 30,
        backgroundColor: "#03DAC5",
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
});
