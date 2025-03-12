import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export interface JobUserDetails {
    avatar: string;
    id: string;
    nameUser: string;
}

export interface Job {
    id: string;
    title: string;
    description: string;
    tags: string[];
    budget: number;
    userDetails: JobUserDetails;
    status: string;
}

interface JobCardProps {
    job: Job;
    onPress: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {

    const truncateDescription = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            {/* Sección de usuario en la parte superior */}
            <View style={styles.userDetailsContainer}>
                <Image source={{ uri: job.userDetails.avatar }} style={styles.avatar} />
                <Text style={styles.userName}>{job.userDetails.nameUser}</Text>
            </View>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.description}>{truncateDescription(job.description, 100)}</Text>
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
    userDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    userName: {
        fontSize: 14,
        color: '#E0E0E0',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#E0E0E0',
    },
    description: {
        fontSize: 14,
        color: '#B0B0B0',
        marginBottom: 6,
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
