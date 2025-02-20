import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    Button,
    TouchableOpacity,
    Text,
    StyleSheet,
    Alert,
} from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FilterParams {
    searchTitle: string;
    selectedTags: string[];
    trianglePoints: { latitude: number; longitude: number }[];
    location: { latitude: number; longitude: number } | null;
    radius: number;
}

interface JobSearchFiltersProps {
    onSearch: (filters: FilterParams) => void;
}

const predefinedTags = [
    'Plomería',
    'Electricidad',
    'Construcción',
    'Pintura',
    'Carpintería',
    'Limpieza',
];

const defaultTrianglePoints = [
    { latitude: -31.6000, longitude: -64.4000 },
    { latitude: -31.2500, longitude: -64.0000 },
    { latitude: -31.3500, longitude: -64.6000 },
];

const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) => {
    const R = 6371000; // metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const computeTriangleData = (
    points: { latitude: number; longitude: number }[]
) => {
    if (points.length !== 3) return null;
    const centroid = {
        latitude:
            (points[0].latitude + points[1].latitude + points[2].latitude) / 3,
        longitude:
            (points[0].longitude + points[1].longitude + points[2].longitude) / 3,
    };
    const d1 = haversineDistance(
        centroid.latitude,
        centroid.longitude,
        points[0].latitude,
        points[0].longitude
    );
    const d2 = haversineDistance(
        centroid.latitude,
        centroid.longitude,
        points[1].latitude,
        points[1].longitude
    );
    const d3 = haversineDistance(
        centroid.latitude,
        centroid.longitude,
        points[2].latitude,
        points[2].longitude
    );
    const radius = Math.max(d1, d2, d3);
    return { centroid, radius };
};

const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({ onSearch }) => {
    const [searchTitle, setSearchTitle] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [trianglePoints, setTrianglePoints] = useState<
        { latitude: number; longitude: number }[]
    >([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [radius, setRadius] = useState<number>(5000);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    useEffect(() => {
        const loadCachedFilters = async () => {
            try {
                const cachedTitle = await AsyncStorage.getItem('searchTitle');
                const cachedTags = await AsyncStorage.getItem('selectedTags');
                const cachedTriangle = await AsyncStorage.getItem('trianglePoints');

                // Valores por defecto o cargados de caché
                const loadedTitle = cachedTitle || '';
                const loadedTags = cachedTags ? JSON.parse(cachedTags) : [];
                let loadedPoints: { latitude: number; longitude: number }[] = [];
                let loadedLocation: { latitude: number; longitude: number } | null = null;
                let loadedRadius = 5000;

                if (cachedTriangle) {
                    loadedPoints = JSON.parse(cachedTriangle);
                    if (loadedPoints.length === 3) {
                        const data = computeTriangleData(loadedPoints);
                        if (data) {
                            loadedLocation = data.centroid;
                            loadedRadius = data.radius;
                        }
                    }
                } else {
                    // Si no hay filtros en caché, usamos los puntos por defecto
                    loadedPoints = defaultTrianglePoints;
                    const data = computeTriangleData(defaultTrianglePoints);
                    if (data) {
                        loadedLocation = data.centroid;
                        loadedRadius = data.radius;
                    }
                }

                // Actualizamos los estados locales
                setSearchTitle(loadedTitle);
                setSelectedTags(loadedTags);
                setTrianglePoints(loadedPoints);
                setLocation(loadedLocation);
                setRadius(loadedRadius);

                // Ejecutamos la búsqueda automáticamente con los filtros cargados
                onSearch({
                    searchTitle: loadedTitle,
                    selectedTags: loadedTags,
                    trianglePoints: loadedPoints,
                    location: loadedLocation,
                    radius: loadedRadius,
                });
            } catch (error) {
                console.error('Error loading cached filters:', error);
            }
        };

        loadCachedFilters();
    }, []);


    // Alternar selección de etiqueta
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Manejar toques en el mapa para definir el área (hasta 3 puntos)
    const handleMapPress = (e: any) => {
        const { coordinate } = e.nativeEvent;
        if (trianglePoints.length < 3) {
            const newPoints = [...trianglePoints, coordinate];
            setTrianglePoints(newPoints);
            if (newPoints.length === 3) {
                const data = computeTriangleData(newPoints);
                if (data) {
                    setLocation(data.centroid);
                    setRadius(data.radius);
                }
            }
        } else {
            Alert.alert('Área definida', 'Ya has seleccionado 3 puntos. Pulsa "Reset Área" para definir otra vez.');
        }
    };

    // Botón Reset: desmarca todos los puntos del mapa
    const resetArea = () => {
        setTrianglePoints([]);
        setLocation(null);
        setRadius(0);
    };

    // Al presionar Buscar, se guardan los filtros en AsyncStorage y se envían al padre
    const handleSearchPress = async () => {
        try {
            await AsyncStorage.setItem('searchTitle', searchTitle);
            await AsyncStorage.setItem('selectedTags', JSON.stringify(selectedTags));
            await AsyncStorage.setItem('trianglePoints', JSON.stringify(trianglePoints));
        } catch (error) {
            console.error('Error saving filters in cache:', error);
        }
        onSearch({ searchTitle, selectedTags, trianglePoints, location, radius });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.filterTitle}>Filtrar Ofertas</Text>
            <TextInput
                style={styles.input}
                placeholder="Buscar por título"
                placeholderTextColor="#888"
                value={searchTitle}
                onChangeText={setSearchTitle}
            />
            <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)} style={styles.moreFiltersButton}>
                <Text style={styles.moreFiltersText}>
                    {showAdvanced ? 'Ocultar Filtros Avanzados' : 'Mostrar Más Filtros'}
                </Text>
            </TouchableOpacity>

            {showAdvanced && (
                <>
                    <Text style={styles.label}>Selecciona Etiquetas:</Text>
                    <View style={styles.tagsContainer}>
                        {predefinedTags.map((tag, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.label}>Selecciona Área en el Mapa:</Text>
                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            customMapStyle={darkMapStyle}
                            initialRegion={{
                                latitude: location ? location.latitude : -31.4201,
                                longitude: location ? location.longitude : -64.1811,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            onPress={handleMapPress}
                        >
                            {trianglePoints.map((point, index) => (
                                <Marker key={index} coordinate={point} />
                            ))}
                            {trianglePoints.length === 3 && (
                                <Polygon
                                    coordinates={trianglePoints}
                                    strokeColor="rgba(187,134,252,0.5)"
                                    fillColor="rgba(187,134,252,0.2)"
                                    strokeWidth={2}
                                />
                            )}
                        </MapView>
                        <View style={styles.mapButtons}>
                            <TouchableOpacity style={styles.resetButton} onPress={resetArea}>
                                <Text style={styles.resetButtonText}>Reset Área</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {location && (
                        <Text style={styles.infoText}>
                            Centro: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </Text>
                    )}
                    <Text style={styles.infoText}>
                        Radio: {radius ? radius.toFixed(2) : 0} metros
                    </Text>
                </>
            )}

            <Button title="Buscar" onPress={handleSearchPress} color="#03DAC5" />
        </View>
    );
};

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    {
        featureType: 'administrative',
        elementType: 'geometry',
        stylers: [{ color: '#757575' }],
    },
    {
        featureType: 'administrative.country',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
    },
    {
        featureType: 'administrative.land_parcel',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#bdbdbd' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#181818' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.fill',
        stylers: [{ color: '#2c2c2c' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8a8a8a' }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#373737' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#3c3c3c' }],
    },
    {
        featureType: 'road.highway.controlled_access',
        elementType: 'geometry',
        stylers: [{ color: '#4e4e4e' }],
    },
    {
        featureType: 'road.local',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
    },
    {
        featureType: 'transit',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#000000' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#3d3d3d' }],
    },
];

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 10,
        marginBottom: 16,
        elevation: 3,
        marginHorizontal: 15,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 2,
    },
    filterTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#E0E0E0',
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
    },
    moreFiltersButton: {
        marginBottom: 10,
    },
    moreFiltersText: {
        color: '#03DAC5',
        fontSize: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#E0E0E0',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    tag: {
        backgroundColor: '#1E1E1E',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    tagSelected: {
        backgroundColor: '#BB86FC',
    },
    tagText: {
        fontSize: 14,
        color: '#E0E0E0',
    },
    tagTextSelected: {
        color: '#121212',
    },
    mapContainer: {
        width: '100%',
        height: 200,
        marginBottom: 12,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapButtons: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    resetButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 5,
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#E0E0E0',
        marginBottom: 4,
    },
});

export default JobSearchFilters;
