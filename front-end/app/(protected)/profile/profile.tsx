// ProfileScreen.tsx
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
    GetLatestJobsForEmployer,
    GetLatestJobsForWorker,
} from "@/services/JobsService";
import { ProfileAdminHeader } from "@/components/headersProfile/ProfileAdminHeader";
import { CreateJob } from "@/components/jobCards/CreateJob";
import { useAuth } from "@/context/AuthContext";
import SupportChat from '@/components/chatsupport/SupportChat';
import { JobCardProfiles } from "@/components/jobCards/JobCardProfiles";


export default function ProfileScreen() {
    const { token, logout } = useAuth();
    const router = useRouter();

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [workerJobs, setWorkerJobs] = useState<any[]>([]);
    const [employerJobs, setEmployerJobs] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<"employer" | "jobFeed">("jobFeed");
    const [createJobVisible, setCreateJobVisible] = useState(false);
    const [currentPageEmployer, setCurrentPageEmployer] = useState(1);
    const [currentPageJobFeed, setCurrentPageJobFeed] = useState(1);
    const [showDropdown, setShowDropdown] = useState(false);
    const [editBioVisible, setEditBioVisible] = useState(false);
    const [biografia, setBiografia] = useState("");

    // ---------------------- Chat de Soporte ----------------------
    const [supportChatVisible, setSupportChatVisible] = useState<boolean>(false);
    // -----------------------------------------------------------

    useEffect(() => {
        const getRating = async () => {
            let res;
            if (activeSection === "jobFeed") {
                res = await GetLatestJobsForWorker(token as string);
            } else {
                res = await GetLatestJobsForEmployer(token as string);
            }

        };
        getRating();
    }, [activeSection, token]);

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
                setCurrentPageJobFeed(1);
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


    const ListHeader = () => (
        <View style={styles.headerContainer}>
            {userProfile && <ProfileAdminHeader user={userProfile} />}

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === "jobFeed" && styles.activeToggle]}
                    onPress={() => setActiveSection("jobFeed")}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            activeSection === "jobFeed" && styles.activeToggleText,
                        ]}
                    >
                        Trabajos realizados
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, activeSection === "employer" && styles.activeToggle]}
                    onPress={() => setActiveSection("employer")}
                >
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

        </View>
    );
    const data = activeSection === "employer" ? employerJobs : workerJobs;
    const renderItem = ({ item }: { item: any }) => {

        return <JobCardProfiles item={item} activeSection={activeSection} />
    }




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

    return (
        <View style={{ flex: 1, backgroundColor: "#121212" }}>
            <FlatList
                data={data}
                keyExtractor={(item) => item?.id.toString()}
                renderItem={renderItem}
                onEndReached={activeSection === "employer" ? loadMoreEmployerJobs : loadMoreJobFeed}
                ListHeaderComponent={ListHeader}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContainer}
            />
            {/* Botón de opciones en la esquina superior derecha */}
            <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <Text style={styles.optionsButtonText}>⋮</Text>
            </TouchableOpacity>
            {showDropdown && (
                <View style={styles.dropdown}>
                    <TouchableOpacity onPress={HandleEditbiografia} style={styles.dropdownButton}>
                        <Text style={styles.dropdownButtonText}>Cambiar descripción</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSubscribe} style={styles.dropdownButton}>
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
                    {
                        userProfile?.PanelAdminNexoVecinal.Level > 0 &&
                        <TouchableOpacity
                            onPress={() => router.push("/profile/adminPanel")}
                            style={styles.dropdownButton}
                        >
                            <Text style={styles.dropdownButtonText}>Administrador</Text>
                        </TouchableOpacity>
                    }
                    <TouchableOpacity
                        onPress={handleLogoutOption}
                        style={[styles.dropdownButton, styles.dropdownLogout]}
                    >
                        <Text style={styles.dropdownButtonText}>Cerrar sesión</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                            <Button title="Guardar" onPress={handleSaveBiografia} color="#03DAC5" />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Chat de Soporte mediante el componente modular */}
            {
                userProfile &&
                <SupportChat
                    visible={supportChatVisible}
                    onClose={() => setSupportChatVisible(false)}
                    token={token as string}
                    userProfile={userProfile}
                />
            }
            {/* Floating Action Button para "Crear Trabajo" */}
            <TouchableOpacity style={styles.fab} onPress={() => setCreateJobVisible(true)}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
            {/* Modal de creación de trabajo */}
            <CreateJob visible={createJobVisible} onClose={() => setCreateJobVisible(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        padding: 6,
        backgroundColor: "#121212",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#121212",
    },
    errorText: {
        color: "#CF6679",
        marginBottom: 20,
        fontSize: 16,
    },
    headerContainer: {
        marginBottom: 16,
        alignItems: "center",
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1E1E1E",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 16,
    },
    starIcon: {
        marginHorizontal: 2,
    },
    ratingText: {
        fontSize: 16,
        color: "#03DAC5",
        marginLeft: 8,
        fontWeight: "600",
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
        backgroundColor: "#1E1E1E",
        borderWidth: 1,
        borderColor: "#444",
    },
    activeToggle: {
        backgroundColor: "#03DAC5",
        borderColor: "#03DAC5",
    },
    toggleButtonText: {
        fontSize: 16,
        color: "#E0E0E0",
    },
    activeToggleText: {
        color: "#121212",
        fontWeight: "bold",
    },
    card: {
        backgroundColor: "#1E1E1E",
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#E0E0E0",
        marginBottom: 4,
    },
    cardStatus: {
        fontSize: 14,
        color: "#B0B0B0",
    },
    optionsButton: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 8,
        backgroundColor: "#1E1E1E",
        borderRadius: 30,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        zIndex: 100,
    },
    optionsButtonText: {
        color: "#E0E0E0",
        fontSize: 24,
    },
    dropdown: {
        position: "absolute",
        top: 50,
        right: 10,
        backgroundColor: "#1E1E1E",
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
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: "#1E1E1E",
        borderRadius: 12,
        padding: 20,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#E0E0E0",
    },
    modalClose: {
        fontSize: 16,
        color: "#03DAC5",
    },
    modalTextInput: {
        height: 100,
        borderColor: "#444",
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        color: "#E0E0E0",
        backgroundColor: "#121212",
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
    fabText: {
        color: "#121212",
        fontSize: 30,
        fontWeight: "bold",
    },
    starContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
    },
    star: {
        fontSize: 24,
        marginHorizontal: 4,
    },
    selectedStar: {
        color: "#F1C40F",
    },
    unselectedStar: {
        color: "#444",
    },
    messageContainer: {
        backgroundColor: "#1E1E1E",
        borderRadius: 8,
        padding: 10,
        marginVertical: 4,
    },
    messageSender: {
        fontSize: 14,
        color: "#BB86FC",
        fontWeight: "bold",
    },
    messageText: {
        fontSize: 16,
        color: "#E0E0E0",
        marginVertical: 4,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#444",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: "#E0E0E0",
    },
    sendButton: {
        backgroundColor: "#03DAC5",
        padding: 12,
        borderRadius: 8,
        marginLeft: 8,
    },
    sendButtonText: {
        color: "#121212",
        fontWeight: "bold",
    },
});

