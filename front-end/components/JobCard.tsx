// /components/JobCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface JobCardProps {
    job: {
        id: string;
        title: string;
        location: string;
        tags: string[];
        budget: number;
        // Puedes incluir otros campos según la información de cada job
    };
    onPress?: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.location}>Ubicación: {job.location}</Text>
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
    location: {
        fontSize: 14,
        color: '#555',
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
