import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getActiveCourses } from '@/services/cursos';
import colors from '@/style/colors';

interface Course {
    id: string;
    title: string;
    description: string;
    seccion: string;
}

export default function CursosScreen() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const data = await getActiveCourses();
                if (Array.isArray(data)) {
                    setCourses(data);
                } else {
                    console.error('Invalid data format:', data);
                }
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
    }, []);

    const groupedCourses = courses?.reduce((acc, course) => {
        if (!acc[course.seccion]) acc[course.seccion] = [];
        acc[course.seccion].push(course);
        return acc;
    }, {} as Record<string, Course[]>);

    const handleCoursePress = (courseId: string) => {
        router.push(`/cursos/${courseId}`);
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#03DAC5" />;
    }

    return (
        <ScrollView style={styles.container}>
            {Object.entries(groupedCourses).map(([section, courses]) => (
                <View key={section} style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{section}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {courses.map(course => (
                            <TouchableOpacity
                                key={course.id}
                                style={styles.courseCard}
                                onPress={() => handleCoursePress(course.id)}
                            >
                                <Text style={styles.courseTitle}>{course.title}</Text>
                                <Text

                                    numberOfLines={3}
                                    ellipsizeMode="tail"
                                    style={styles.courseDescription}>{course.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            ))}
        </ScrollView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // "#FFFFFF"
        padding: 16,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "600",
        color: colors.textDark, // "#03DAC5"
        marginBottom: 8,
    },
    courseCard: {
        backgroundColor: colors.cream, // "#FFF8DC"
        padding: 16,
        borderRadius: 8,
        marginRight: 12,
        width: 280,
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        marginBottom: 8,
    },
    courseDescription: {
        fontSize: 14,
        color: colors.textMuted, // "#888"
    },
});
