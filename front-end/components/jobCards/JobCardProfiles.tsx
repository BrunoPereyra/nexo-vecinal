import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";

interface JobCardProfilesProps {
    item: any;
    activeSection: "employer" | "jobFeed";
}

export const JobCardProfiles: React.FC<JobCardProfilesProps> = ({
    item,
    activeSection,
}) => {
    const pathname = usePathname();
    const router = useRouter();

    // Permitir navegación solo si estamos dentro de /profile/
    const isInProtectedProfile = pathname.startsWith("/profile/");

    const feedback = activeSection === "employer" ? item.workerFeedback : item.employerFeedback;
    const rating = feedback?.rating;
    const comment = feedback?.comment;

    const handlePress = () => {
        if (!isInProtectedProfile) return;

        if (activeSection !== "employer") {
            if (isInProtectedProfile) {
                router.push(`/profile/JobDetailWorker?id=${item?.id}`);
            } else {
                router.push(`/jobsStatus/JobDetailWorker?id=${item?.id}`);
            }
        } else {
            router.push(`/profile/EmployerJobDetail?id=${item?.id}`);
        }
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardStatus}>Estado: {item.status}</Text>

            {feedback && (
                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackText}>
                        Comentario: {comment || "Sin comentarios"}
                    </Text>
                    <View style={styles.starContainer}>
                        {[1, 2, 3, 4, 5].map((star, index) => (
                            <Ionicons
                                key={index}
                                name={star <= rating ? "star" : "star-outline"}
                                size={20}
                                color={star <= rating ? "#F1C40F" : "#444"}
                            />
                        ))}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#203a43",
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
        // Sombra suave
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#E0E0E0",
        marginBottom: 4,
    },
    cardStatus: {
        fontSize: 14,
        color: "#B0B0B0",
        marginBottom: 6,
    },
    feedbackContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: "#2c5364",
        borderRadius: 8,
    },
    feedbackText: {
        fontSize: 14,
        color: "#D0D0D0",
    },
    starContainer: {
        flexDirection: "row",
        marginTop: 4,
    },
});
