import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCourseById } from '@/services/cursos';
import colors from '@/style/colors';
import * as WebBrowser from 'expo-web-browser';

interface Course {
    id: string;
    title: string;
    description: string;
    content: string;
    socials?: {
        instagram?: string;
        youtube?: string;
        website?: string;
        twitter?: string;
    };
}

const SocialLinks = ({ socials }: { socials: Course['socials'] }) => {
    const handlePress = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                await WebBrowser.openBrowserAsync(url);
            }
        } catch (e) {
            Alert.alert("Error", "No se pudo abrir el enlace.");
        }
    };

    console.log("Socials:", socials);

    return (
        <View style={styles.socialContainer}>
            {socials?.instagram && (
                <TouchableOpacity onPress={() => handlePress(socials.instagram!)}>
                    <FontAwesome name="instagram" size={28} color="#textDark" style={styles.icon} />
                </TouchableOpacity>

            )}
            {socials?.youtube && (
                <TouchableOpacity onPress={() => handlePress(socials.youtube!)}>
                    <FontAwesome name="youtube-play" size={28} color="#textDark" style={styles.icon} />
                </TouchableOpacity>
            )}
            {socials?.website && (
                <TouchableOpacity onPress={() => handlePress(socials.website!)}>
                    <MaterialCommunityIcons name="web" size={28} color="#textDark" style={styles.icon} />
                </TouchableOpacity>
            )}
            {socials?.twitter && (
                <TouchableOpacity onPress={() => handlePress(socials.twitter!)}>
                    <FontAwesome name="twitter" size={28} color="#textDark" style={styles.icon} />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default function CursoDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getCourseById(id)
                .then((data: Course) => {
                    setCourse(data);
                })
                .catch((error) => {
                    console.error("Error fetching course:", error);
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#textDark" />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Curso no encontrado.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Botón de volver rediseñado */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <FontAwesome name="arrow-left" size={20} color="#textDark" />
            </TouchableOpacity>

            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.description}>{course.description}</Text>
            <View style={styles.contentContainer}>
                <Text style={styles.contentTitle}>Contenido del Curso</Text>
                <Text style={styles.content}>{course.content}</Text>
            </View>
            {course.socials && Object.keys(course.socials).length > 0 && <SocialLinks socials={course.socials} />}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // "#FFFFFF"
        padding: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: colors.warmWhite, // "#textDark"
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        marginBottom: 8,
    },
    description: {
        fontSize: 18,
        color: colors.textMuted, // "#888"
        marginBottom: 16,
    },
    contentContainer: {
        backgroundColor: colors.cream, // "#FFF8DC"
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    contentTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.textDark, // "#textDark"
        marginBottom: 8,
    },
    content: {
        fontSize: 16,
        color: colors.textDark, // "#333"
    },
    errorText: {
        fontSize: 18,
        color: colors.errorRed, // "#CF6679"
        textAlign: "center",
    },
    socialContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 16,
    },
    icon: {
        marginHorizontal: 8,
    },
});