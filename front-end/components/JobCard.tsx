import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';

interface JobLocation {
    type: string;
    coordinates: number[];
}

interface Job {
    id: string;
    title: string;
    location: string | JobLocation;
    tags: string[];
    budget: number;
}

interface JobCardProps {
    job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
    const router = useRouter(); // Hook para navegación

    const renderLocationMap = (location: string | JobLocation) => {
        if (typeof location === 'object' && location.type === 'Point' && Array.isArray(location.coordinates)) {
            const [longitude, latitude] = location.coordinates;
            const region = {
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            return (
                <MapView
                    style={styles.map}
                    initialRegion={region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    pointerEvents="none"
                >
                    <Marker coordinate={{ latitude, longitude }} />
                </MapView>
            );
        } else if (typeof location === 'string') {
            return <Text style={styles.locationText}>{location}</Text>;
        }
        return null;
    };

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={() => {
            router.push(`/JobDetail?id=${job.id}`)
        }}>
            <Text style={styles.title}>{job.title}</Text>

            <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>Ubicación:</Text>
                {renderLocationMap(job.location)}
            </View>

            <Text style={styles.budget}>Presupuesto: ${job.budget.toFixed(2)}</Text>

            <View style={styles.tagsContainer}>
                {job.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333',
    },
    locationContainer: {
        marginVertical: 6,
    },
    locationLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#555',
    },
    map: {
        width: '100%',
        height: 150,
        borderRadius: 5,
    },
    budget: {
        fontSize: 14,
        color: '#1e88e5',
        marginVertical: 6,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tag: {
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: '#333',
    },
});

export default JobCard;
