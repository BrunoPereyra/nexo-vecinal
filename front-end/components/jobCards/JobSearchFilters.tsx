// JobSearchFilters.tsx
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
import MapView, { Marker, Circle, UrlTile } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as Location from 'expo-location';
import ErrorBoundary from '@/components/ErrorBoundary'; // Ajusta la ruta según la estructura de tu proyecto

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
            setSelectedTags((prevSelectedTags) =>
                prevSelectedTags.filter((tag) => availableTags.includes(tag))
            );
        }
    }, [availableTags]);

    // Solicitar permisos de ubicación y obtener la ubicación actual
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
                const cachedTitle = await AsyncStorage.getItem('searchTitle');
                const cachedTags = await AsyncStorage.getItem('selectedTags');
                const cachedLocation = await AsyncStorage.getItem('location');
                const cachedRadius = await AsyncStorage.getItem('radius');

                setSearchTitle(cachedTitle || '');
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
                    onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                    style={styles.filterIconButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="options-outline" size={24} color="#03DAC5" />
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
                                        {availableTags.map((tag, index) => (
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
                                            console.log('Mapa listo');
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
        padding: 16,
        backgroundColor: '#121212',
        borderRadius: 10,
        marginHorizontal: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 2,
        borderColor: '#444',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
    },
    filterIconButton: {
        marginLeft: 8,
        padding: 8,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#E0E0E0',
        textAlign: 'center',
        marginVertical: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E0E0E0',
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    tag: {
        backgroundColor: '#121212',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    tagSelected: {
        backgroundColor: '#BB86FC',
    },
    tagText: {
        fontSize: 12,
        color: '#E0E0E0',
    },
    tagTextSelected: {
        color: '#121212',
    },
    mapContainer: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    radiusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    radiusLabel: {
        fontSize: 16,
        color: '#E0E0E0',
        marginRight: 10,
    },
    radiusButton: {
        backgroundColor: '#03DAC5',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 10,
    },
    radiusButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#121212',
    },
    radiusText: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    modalButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: '#444',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#03DAC5',
    },
});

export default JobSearchFilters;
