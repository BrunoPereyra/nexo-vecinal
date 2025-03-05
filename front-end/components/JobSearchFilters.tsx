import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

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
    const { tags } = useAuth();
    const [searchTitle, setSearchTitle] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    // Radio en metros; por defecto 5000 m (5 km)
    const [radius, setRadius] = useState<number>(5000);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    useEffect(() => {
        const loadCachedFilters = async () => {
            try {
                const cachedTitle = await AsyncStorage.getItem('searchTitle');
                const cachedTags = await AsyncStorage.getItem('selectedTags');
                const cachedLocation = await AsyncStorage.getItem('location');
                const cachedRadius = await AsyncStorage.getItem('radius');

                const loadedTitle = cachedTitle || '';
                const loadedTags = cachedTags ? JSON.parse(cachedTags) : [];
                const loadedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
                const loadedRadius = cachedRadius ? Number(cachedRadius) : 5000;

                setSearchTitle(loadedTitle);
                setSelectedTags(loadedTags);
                setLocation(loadedLocation);
                setRadius(loadedRadius);

                onSearch({
                    searchTitle: loadedTitle,
                    selectedTags: loadedTags,
                    location: loadedLocation,
                    radius: loadedRadius,
                });
            } catch (error) {
                console.error('Error loading cached filters:', error);
            }
        };

        loadCachedFilters();
    }, []);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Al tocar el mapa se define el centro de búsqueda.
    const handleMapPress = (e: any) => {
        const { coordinate } = e.nativeEvent;
        setLocation(coordinate);
    };

    // Funciones para incrementar o decrementar el radio en 10 km (5000 m)
    const increaseRadius = () => setRadius(prev => prev + 5000);
    const decreaseRadius = () => setRadius(prev => (prev - 5000 >= 0 ? prev - 5000 : 0));

    // Guarda filtros en caché y ejecuta la búsqueda.
    const handleSearchPress = async () => {
        try {
            await AsyncStorage.setItem('searchTitle', searchTitle);
            await AsyncStorage.setItem('selectedTags', JSON.stringify(selectedTags));
            await AsyncStorage.setItem('location', JSON.stringify(location));
            await AsyncStorage.setItem('radius', radius.toString());
        } catch (error) {
            console.error('Error saving filters in cache:', error);
        }
        setShowAdvanced(false);
        onSearch({ searchTitle, selectedTags, location, radius });
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Buscar por título"
                placeholderTextColor="#888"
                value={searchTitle}
                onChangeText={setSearchTitle}
            />
            {/* Header para expandir/contraer filtros avanzados */}
            <TouchableOpacity
                style={styles.advancedHeader}
                onPress={() => setShowAdvanced(prev => !prev)}
            >
                <Text style={styles.advancedHeaderText}>Filtros Avanzados</Text>
                <Text style={[styles.arrow, showAdvanced && styles.arrowUp]}>
                    {showAdvanced ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>

            {showAdvanced && (
                <>
                    {tags.length > 0 && (
                        <>
                            <Text style={styles.label}>Selecciona Etiquetas:</Text>
                            <View style={styles.tagsContainer}>
                                {tags.map((tag, index) => (
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
                        </>
                    )}

                    <Text style={styles.label}>Alcance de tu trabajo:</Text>
                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            // customMapStyle={darkMapStyle}
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
                    </View>

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
                </>
            )}

            <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
                <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 16,
        elevation: 3,
        marginHorizontal: 15,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 2,
        backgroundColor: '#1E1E1E',
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#121212',
        color: '#E0E0E0',
    },
    moreFiltersButton: {
        marginBottom: 10,
        alignSelf: 'flex-end',
    },
    moreFiltersText: {
        color: '#03DAC5',
        fontSize: 14,
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
        marginBottom: 12,
        borderRadius: 8,
        overflow: 'hidden',
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
    searchButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    searchButtonText: {
        color: '#121212',
        fontSize: 16,
        fontWeight: 'bold',
    },
    advancedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    advancedHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E0E0E0',
    },
    arrow: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    arrowUp: {
        transform: [{ rotate: '180deg' }],
    },
});
// const darkMapStyle = [
//     { elementType: 'geometry', stylers: [{ color: '#212121' }] },
//     { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
//     { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
//     { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
//     {
//         featureType: 'administrative',
//         elementType: 'geometry',
//         stylers: [{ color: '#757575' }],
//     },
//     {
//         featureType: 'administrative.country',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#9e9e9e' }],
//     },
//     {
//         featureType: 'administrative.land_parcel',
//         stylers: [{ visibility: 'off' }],
//     },
//     {
//         featureType: 'administrative.locality',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#bdbdbd' }],
//     },
//     {
//         featureType: 'poi',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#757575' }],
//     },
//     {
//         featureType: 'poi.park',
//         elementType: 'geometry',
//         stylers: [{ color: '#181818' }],
//     },
//     {
//         featureType: 'poi.park',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#616161' }],
//     },
//     {
//         featureType: 'road',
//         elementType: 'geometry.fill',
//         stylers: [{ color: '#2c2c2c' }],
//     },
//     {
//         featureType: 'road',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#8a8a8a' }],
//     },
//     {
//         featureType: 'road.arterial',
//         elementType: 'geometry',
//         stylers: [{ color: '#373737' }],
//     },
//     {
//         featureType: 'road.highway',
//         elementType: 'geometry',
//         stylers: [{ color: '#3c3c3c' }],
//     },
//     {
//         featureType: 'road.highway.controlled_access',
//         elementType: 'geometry',
//         stylers: [{ color: '#4e4e4e' }],
//     },
//     {
//         featureType: 'road.local',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#616161' }],
//     },
//     {
//         featureType: 'transit',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#757575' }],
//     },
//     {
//         featureType: 'water',
//         elementType: 'geometry',
//         stylers: [{ color: '#000000' }],
//     },
//     {
//         featureType: 'water',
//         elementType: 'labels.text.fill',
//         stylers: [{ color: '#3d3d3d' }],
//     },
// ];
export default JobSearchFilters;
