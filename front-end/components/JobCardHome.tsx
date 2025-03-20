import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";

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
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            {/* Sección de usuario en la parte superior */}
            <View style={styles.userDetailsContainer}>
                <Image source={{ uri: job.userDetails.avatar }} style={styles.avatar} />
                <Text style={styles.userName}>{job.userDetails.nameUser}</Text>
            </View>

            <Text style={styles.title}>{job.title}</Text>

            <Text style={styles.description}>
                {truncateDescription(job.description, 100)}
            </Text>

            <View style={styles.budgetContainer}>
                <Text style={styles.budgetText}>
                    Presupuesto: ${job.budget.toFixed(2)}
                </Text>
            </View>

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
        backgroundColor: "#203a43",
        padding: 16,
        marginVertical: 12,
        borderRadius: 12,
        // Sombra suave
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    userDetailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    userName: {
        fontSize: 14,
        color: "#AAAAAA",
        fontWeight: "bold",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#E0E0E0",
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: "#B0B0B0",
        marginBottom: 8,
        lineHeight: 20,
    },
    budgetContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    budgetText: {
        fontSize: 14,
        color: "#03DAC5", // color de acento
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 8,
    },
    tag: {
        backgroundColor: "#2c5364",
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: "#E0E0E0",
    },
});

export default JobCard;
