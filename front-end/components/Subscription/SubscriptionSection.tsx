import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
} from "react-native";
import MapView, { Marker, MapPressEvent, Circle } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "@/style/colors";
import { useAuth } from "@/context/AuthContext";
import { ReqLocationTags, saveLocationTags, } from "@/services/userService";
import { useRevenueCat } from "@/hooks/useInAppPurchase";
import AsyncStorage from "@react-native-async-storage/async-storage";


interface SubscriptionSectionProps {
    jobsCompleted: number;
    averageRating: number;
    isSubscribed: boolean;
}

const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
    isSubscribed,
}) => {
    const { token, tags: availableTags } = useAuth();
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [radius, setRadius] = useState<number>(5000);
    const [modalVisible, setModalVisible] = useState(false);
    const [subscribing, setSubscribing] = useState(false);
    const [subscriptionConfirmVisible, setSubscriptionConfirmVisible] = useState(false);
    const [UserId, setUserId] = useState<string>("");

    useEffect(() => {
        const id = async () => {
            const userid = await AsyncStorage.getItem('id');
            setUserId(userid as string);
        }
        id()
    }, [])
    const { buySubscription } = useRevenueCat(UserId);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleMapPress = (e: MapPressEvent) => {
        const { coordinate } = e.nativeEvent;
        setLocation(coordinate);
    };

    const increaseRadius = () => setRadius((prev) => prev + 5000);
    const decreaseRadius = () => setRadius((prev) => (prev - 5000 >= 0 ? prev - 5000 : 0));

    const handleSubmit = async () => {
        if (selectedTags.length === 0) {
            Alert.alert("Error", "Debes seleccionar al menos un tag de especialización.");
            return;
        }
        if (!location) {
            Alert.alert("Error", "Debes seleccionar tu zona de disponibilidad en el mapa.");
            return;
        }
        const filters: ReqLocationTags = {
            location: {
                type: "Point",
                coordinates: [location.longitude, location.latitude],
            },
            ratio: radius,
            tags: selectedTags,
        };
        setSubscribing(true);
        try {
            const res = await saveLocationTags(filters, token as string);
            if (res.message === "save location") {
                Alert.alert("Éxito", "Preferencias actualizadas correctamente.");
                // Luego de guardar, mostrar modal para confirmar la suscripción.
                setSubscriptionConfirmVisible(true);
            } else {
                Alert.alert("Error", res.message || "No se pudo actualizar las preferencias.");
            }
            setModalVisible(false);
        } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo actualizar la suscripción.");
        } finally {
            setSubscribing(false);
        }
    };
    const handleConfirmSubscription = async () => {
        buySubscription();
    };


    return (
        <View style={styles.subscriptionContainer}>

            <Text style={styles.subscriptionTitle}>
                {isSubscribed ? "Modificar Preferencias de Suscripción" : "Suscríbete para ser recomendado"}
            </Text>
            <Text style={styles.subscriptionDescription}>
                Al suscribirte, tu perfil aparecerá en la sección de "Usuarios Recomendados" en la pantalla de inicio
                y serás sugerido a los empleadores cuando publiquen trabajos que coincidan con tus especializaciones.
            </Text>
            <Text style={styles.subscriptionDescription}>
                Selecciona tus áreas de especialización y tu zona de disponibilidad.
            </Text>


            <View style={styles.tagsContainer} >
                {availableTags.map((tag, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.tagButton, selectedTags.includes(tag) && styles.tagButtonSelected]}
                        onPress={() => toggleTag(tag)}
                    >
                        <Text style={[styles.tagButtonText, selectedTags.includes(tag) && styles.tagButtonTextSelected]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.label}>Selecciona tu zona de disponibilidad:</Text>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: location ? location.latitude : -31.4201,
                    longitude: location ? location.longitude : -64.1811,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                onPress={handleMapPress}
            >
                {location && <Marker coordinate={location} />}
                {location && (
                    <Circle
                        center={location}
                        radius={radius}
                        strokeColor="rgba(3, 1, 6, 0.5)"
                        fillColor="rgba(18, 7, 30, 0.2)"
                        strokeWidth={2}
                    />
                )}
            </MapView>
            <View style={styles.radiusContainer}>
                <Text style={styles.radiusLabel}>Alcance:</Text>
                <TouchableOpacity style={styles.radiusButton} onPress={decreaseRadius}>
                    <Text style={styles.radiusButtonText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.radiusText}>{(radius / 1000).toFixed(1)} km</Text>
                <TouchableOpacity style={styles.radiusButton} onPress={increaseRadius}>
                    <Text style={styles.radiusButtonText}>+</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.subscribeButton} onPress={() => setModalVisible(true)}>
                <MaterialIcons name="subscriptions" size={24} color={colors.textLight} />
                <Text style={styles.subscribeButtonText}>{isSubscribed ? "Guardar Cambios" : "Suscribirse"}</Text>
            </TouchableOpacity>
            {/* Modal para confirmar o modificar la suscripción */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{isSubscribed ? "Modificar Suscripción" : "Confirmar Suscripción"}</Text>
                        <Text style={styles.modalInfo}>Especializaciones: {selectedTags.join(", ") || "No seleccionadas"}</Text>
                        <Text style={styles.modalInfo}>Zona: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "No seleccionada"}</Text>
                        <Text style={styles.modalInfo}>Alcance: {(radius / 1000).toFixed(1)} km</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)} disabled={subscribing}>
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit} disabled={subscribing}>
                                {subscribing ? (
                                    <ActivityIndicator color={colors.textLight} />
                                ) : (
                                    <Text style={styles.modalButtonText}>{isSubscribed ? "Guardar" : "Suscribirse"}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal visible={subscriptionConfirmVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Beneficios de la Suscripción</Text>
                        <Text style={styles.modalInfo}>
                            ¿Deseas recibir los beneficios de la suscripción (recomendaciones y ventajas exclusivas) a través de Google Play?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setSubscriptionConfirmVisible(false)}
                                disabled={subscribing}
                            >
                                <Text style={styles.modalButtonText}>No, gracias</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleConfirmSubscription}
                                disabled={subscribing}
                            >
                                {subscribing ? (
                                    <ActivityIndicator color={colors.textLight} />
                                ) : (
                                    <Text style={styles.modalButtonText}>Sí, suscribirme</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    subscriptionContainer: {
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 8,
        margin: 16,
    },
    subscriptionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 8,
        textAlign: "center",
    },
    subscriptionDescription: {
        fontSize: 14,
        color: colors.textGrey,
        marginBottom: 16,
        textAlign: "center",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        height: 60
    },
    tagButton: {
        backgroundColor: colors.cream,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    tagButtonSelected: {
        backgroundColor: colors.gold,
    },
    tagButtonText: {
        color: colors.textDark,
        fontSize: 14,
    },
    tagButtonTextSelected: {
        fontWeight: "bold",
    },
    label: {
        fontSize: 14,
        color: colors.textDark,
        marginBottom: 8,
    },
    map: {
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    radiusContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        marginBottom: 16,
    },
    radiusLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textDark,
        marginRight: 8,
    },
    radiusButton: {
        backgroundColor: colors.gold,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 10,
    },
    radiusButtonText: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark,
    },
    radiusText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textDark,
    },
    subscribeButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.darkBackground,
        paddingVertical: 12,
        borderRadius: 8,
    },
    subscribeButtonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "90%",
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 12,
        textAlign: "center",
    },
    modalInfo: {
        fontSize: 16,
        color: colors.textGrey,
        marginBottom: 8,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: colors.errorRed,
    },
    submitButton: {
        backgroundColor: colors.gold,
    },
    modalButtonText: {
        color: colors.textDark,
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default SubscriptionSection;
