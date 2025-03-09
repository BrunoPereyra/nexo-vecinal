import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getActiveCourses } from '@/services/cursos';

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
                setCourses(data);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
    }, []);

    const groupedCourses = courses.reduce((acc, course) => {
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
                                <Text style={styles.courseDescription}>{course.description}</Text>
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
        backgroundColor: '#121212',
        padding: 16,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#03DAC5',
        marginBottom: 8,
    },
    courseCard: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 8,
        marginRight: 12,
        width: 280,
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 8,
    },
    courseDescription: {
        fontSize: 14,
        color: '#B0B0B0',
    },
});

