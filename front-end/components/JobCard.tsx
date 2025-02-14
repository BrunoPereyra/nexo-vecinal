import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    const router = useRouter();

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
                    style={darkStyles.map}
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
            return <Text style={darkStyles.locationText}>{location}</Text>;
        }
        return null;
    };

    return (
        <TouchableOpacity
            style={darkStyles.cardContainer}
            onPress={() => {
                router.push(`/JobDetail?id=${job.id}`);
            }}
        >
            <Text style={darkStyles.title}>{job.title}</Text>
            <View style={darkStyles.locationContainer}>
                <Text style={darkStyles.locationLabel}>Ubicación:</Text>
                {renderLocationMap(job.location)}
            </View>
            <Text style={darkStyles.budget}>Presupuesto: ${job.budget.toFixed(2)}</Text>
            <View style={darkStyles.tagsContainer}>
                {job.tags.map((tag, index) => (
                    <View key={index} style={darkStyles.tag}>
                        <Text style={darkStyles.tagText}>{tag}</Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );
};

const darkStyles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#1E1E1E',
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
        color: '#E0E0E0',
    },
    locationContainer: {
        marginVertical: 6,
    },
    locationLabel: {
        fontSize: 14,
        color: '#B0B0B0',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#B0B0B0',
    },
    map: {
        width: '100%',
        height: 150,
        borderRadius: 5,
    },
    budget: {
        fontSize: 14,
        color: '#03DAC5',
        marginVertical: 6,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tag: {
        backgroundColor: '#333',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: '#E0E0E0',
    },
});

export default JobCard;
