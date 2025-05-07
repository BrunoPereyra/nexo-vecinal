import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import MapView, { Marker, MapPressEvent, Circle } from "react-native-maps";
import colors from "@/style/colors";
import { useAuth } from "@/context/AuthContext";
import { ReqLocationTags, saveLocationTags } from "@/services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";
interface LocationPreferencesSetupProps {
    onSave: () => void; // Callback para notificar al componente padre cuando se guarden las preferencias
    onClose: () => void; // Callback para cerrar el modal sin guardar
}

const JobRecommendationsLocation: React.FC<LocationPreferencesSetupProps> = ({ onSave, onClose }) => {
    const { token, tags: availableTags } = useAuth();
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [radius, setRadius] = useState<number>(5000);
    const [saving, setSaving] = useState(false);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((t) => t !== tag);
            } else if (prev.length < 3) {
                return [...prev, tag];
            } else {
                Alert.alert("Límite alcanzado", "Solo puedes seleccionar hasta 3 especializaciones.");
                return prev;
            }
        });
    };

    const handleMapPress = (e: MapPressEvent) => {
        setLocation(e.nativeEvent.coordinate);
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

        setSaving(true);
        try {
            const res = await saveLocationTags(filters, token as string);
            if (res.message === "save location") {
                await AsyncStorage.setItem(
                    "jobRecommendationsLocation",
                    JSON.stringify(filters)
                );
                onSave();
            } else {
                Alert.alert("Error", res.message || "No se pudo guardar la información.");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Ocurrió un error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>Guarda tus preferencias</Text>
                <Text style={styles.description}>Selecciona tus especializaciones y zona de disponibilidad.</Text>

                <View style={styles.tagsContainer}>
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

                <Text style={styles.label}>Zona de disponibilidad:</Text>
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: location?.latitude || -31.4201,
                        longitude: location?.longitude || -64.1811,
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

                <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
                        <Text style={styles.modalButtonTextCerrar}>Cerrar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit} disabled={saving}>
                        {saving ? <ActivityIndicator color={colors.textLight} /> : <Text style={styles.modalButtonText}>Guardar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    scrollContainer: {
        paddingBottom: 30,
    },

    container: {
        flex: 1,
        padding: 16,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 6,
        color: colors.textDark,
    },
    description: {
        fontSize: 16,
        color: colors.textGrey, // ver
        marginBottom: 16,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    tagButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderDark,// ver
        backgroundColor: colors.background,
    },
    tagButtonSelected: {
        backgroundColor: colors.cream, // ver

        color: colors.textDark,

    },
    tagButtonText: {
        fontSize: 14,
        color: colors.textDark,
    },
    tagButtonTextSelected: {
        color: colors.textDark,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: colors.textDark,
    },
    map: {
        height: 250,
        borderRadius: 10,
        marginBottom: 16,
    },
    radiusContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    radiusLabel: {
        fontSize: 16,
        color: colors.textDark,
        marginRight: 10,
    },
    radiusButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gold,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 10,
    },
    radiusButtonText: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
    },
    radiusText: {
        fontSize: 16,
        color: colors.textDark,
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.gold,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 8,
    },
    saveButtonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContent: {
        backgroundColor: colors.cream, // ver
        borderRadius: 12,
        padding: 20,
        width: "100%",
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 12,
    },
    modalInfo: {
        fontSize: 14,
        color: colors.textGrey,
        marginBottom: 6,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: colors.gold,
    },
    submitButton: {
        color: colors.background,
        backgroundColor: colors.borderDark,
    },
    modalButtonText: {
        color: colors.background,
        fontWeight: "600",
    },
    modalButtonTextCerrar: {
        color: colors.textDark,
        fontWeight: "600",
    },
});

export default JobRecommendationsLocation;
