import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as Location from 'expo-location';
import ErrorBoundary from '@/components/ErrorBoundary';
import colors from '@/style/colors';


export interface FilterParams {
    searchTitle: string;
    selectedTags: string[];
    location: { latitude: number; longitude: number } | null;
    radius: number;
}

interface JobSearchFiltersProps {
    onSearch: (filters: FilterParams) => void;
}

const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({ onSearch }) => {
    const { tags: availableTags } = useAuth();
    const [isMapReady, setIsMapReady] = useState(false);
    const [searchTitle, setSearchTitle] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [radius, setRadius] = useState<number>(5000); // 5 km por defecto

    useEffect(() => {
        if (availableTags) {
            setSelectedTags((prev) =>
                prev.filter((tag) => availableTags.includes(tag))
            );
        }
    }, [availableTags]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Necesitas dar permisos de ubicación para usar el mapa.');
            } else {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                });
            }
        })();
    }, []);

    useEffect(() => {
        const loadCachedFilters = async () => {
            try {
                // const cachedTitle = await AsyncStorage.getItem('searchTitle');
                const cachedTags = await AsyncStorage.getItem('selectedTags');
                const cachedLocation = await AsyncStorage.getItem('location');
                const cachedRadius = await AsyncStorage.getItem('radius');

                setSearchTitle('');
                setSelectedTags(cachedTags ? JSON.parse(cachedTags) : []);
                setLocation(cachedLocation ? JSON.parse(cachedLocation) : null);
                setRadius(cachedRadius ? Number(cachedRadius) : 5000);
            } catch (error) {
                console.error('Error loading cached filters:', error);
            }
        };

        loadCachedFilters();
    }, []);

    const applyFilters = async () => {
        try {
            await AsyncStorage.setItem('searchTitle', searchTitle);
            await AsyncStorage.setItem('selectedTags', JSON.stringify(selectedTags));
            await AsyncStorage.setItem('location', JSON.stringify(location));
            await AsyncStorage.setItem('radius', radius.toString());
        } catch (error) {
            console.error('Error saving filters in cache:', error);
        }
        setModalVisible(false);
        onSearch({ searchTitle, selectedTags, location, radius });
    };


    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            onSearch({ searchTitle, selectedTags, location, radius });
        }, 300);
        return () => clearTimeout(debounceTimeout);
    }, [searchTitle, selectedTags, location, radius]);



    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleMapPress = (e: any) => {
        const { coordinate } = e.nativeEvent;
        setLocation(coordinate);
    };

    const increaseRadius = () => setRadius((prev) => prev + 5000);
    const decreaseRadius = () => setRadius((prev) => (prev - 5000 >= 0 ? prev - 5000 : 0));

    const handleSubmit = () => {
        onSearch({ searchTitle, selectedTags, location, radius });
    };

    return (
        <View style={styles.container}>
            {/* Input y botón de filtros en línea */}
            <View style={styles.searchRow}>
                <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Buscar por título..."
                    placeholderTextColor="#888"
                    value={searchTitle}
                    onChangeText={setSearchTitle}
                    returnKeyType="search"
                // onSubmitEditing={applyFilters}
                />
                <TouchableOpacity
                    style={styles.filterIconButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="filter-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Modal de filtros avanzados */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{ padding: 16 }}>
                            <Text style={styles.modalTitle}>Filtros Avanzados</Text>

                            {/* Sección de Etiquetas */}
                            {availableTags?.length > 0 && (
                                <>
                                    <Text style={styles.label}>Etiquetas:</Text>
                                    <View style={styles.tagsContainer}>
                                        {availableTags.map((tag: string, index: number) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.tag,
                                                    selectedTags.includes(tag) && styles.tagSelected,
                                                ]}
                                                onPress={() => toggleTag(tag)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.tagText,
                                                        selectedTags.includes(tag) && styles.tagTextSelected,
                                                    ]}
                                                >
                                                    {tag}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* Sección de Ubicación */}
                            <Text style={styles.label}>Ubicación:</Text>
                            <View style={styles.mapContainer}>
                                <ErrorBoundary>
                                    <MapView
                                        style={styles.map}
                                        initialRegion={{
                                            latitude: location ? location.latitude : -31.4201,
                                            longitude: location ? location.longitude : -64.1811,
                                            latitudeDelta: 0.05,
                                            longitudeDelta: 0.05,
                                        }}
                                        onPress={handleMapPress}
                                        onMapReady={() => {
                                            setIsMapReady(true);
                                            console.log("Mapa listo");
                                        }}
                                    >
                                        {location && isMapReady && <Marker coordinate={location} />}
                                        {location && isMapReady && (
                                            <Circle
                                                center={location}
                                                radius={radius}
                                                strokeColor="rgba(3, 1, 6, 0.5)"
                                                fillColor="rgba(18, 7, 30, 0.2)"
                                                strokeWidth={2}
                                            />
                                        )}
                                    </MapView>
                                </ErrorBoundary>
                            </View>

                            {/* Sección de Alcance */}
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
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButton} onPress={applyFilters}>
                                <Text style={styles.modalButtonText}>Aplicar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 10,
        marginHorizontal: 5,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 0,
        marginBottom: 10,
    },
    input: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        color: colors.textDark,
        borderWidth: 1,
        borderColor: colors.borderLight,
        fontSize: 15,
        marginRight: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
        boxShadow: "5px 5px 5px rgba(0,0,0,0.04)",
    },
    filterIconButton: {
        marginLeft: 8,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
        boxShadow: "5px 5px 5px rgba(0,0,0,0.04)",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: colors.background, // "#FFFFFF"
        borderRadius: 12,
        overflow: "hidden",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        textAlign: "center",
        marginVertical: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textDark, // "#333"
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 12,
    },
    tag: {
        backgroundColor: colors.background, // "#FFFFFF"
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    tagSelected: {
        backgroundColor: colors.gold, // "#FFD700"
    },
    tagText: {
        fontSize: 12,
        color: colors.textDark, // "#333"
    },
    tagTextSelected: {
        color: colors.textDark, // "#333"
    },
    mapContainer: {
        width: "100%",
        height: 150,
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 12,
    },
    map: {
        width: "100%",
        height: "100%",
    },
    radiusContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    radiusLabel: {
        fontSize: 16,
        color: colors.textDark, // "#333"
        marginRight: 10,
    },
    radiusButton: {
        backgroundColor: colors.gold, // "#FFD700"
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 10,
    },
    radiusButtonText: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
    },
    radiusText: {
        fontSize: 16,
        color: colors.textDark, // "#333"
    },
    modalButtons: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.textDark, // "#FFD700"
    },
});
export default JobSearchFilters;
