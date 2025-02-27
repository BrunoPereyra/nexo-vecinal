// Ubicado en /app/(protected)/cursos.tsx (o la ruta que definas para cursos)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const courseSections = [
    {
        id: "1",
        title: "Programación",
        courses: [
            { id: "101", title: "Introducción a JavaScript", description: "Aprende lo básico de JavaScript." },
            { id: "102", title: "React Native Avanzado", description: "Desarrolla apps móviles con React Native." },
        ]
    },
    {
        id: "2",
        title: "Diseño",
        courses: [
            { id: "201", title: "Diseño UX/UI", description: "Mejora la experiencia de usuario." },
            { id: "202", title: "Adobe Illustrator para Principiantes", description: "Aprende a diseñar con Illustrator." },
        ]
    },
    {
        id: "3",
        title: "Marketing",
        courses: [
            { id: "301", title: "Marketing Digital", description: "Estrategias para el marketing digital." },
            { id: "302", title: "SEO y SEM", description: "Optimiza tus campañas de publicidad." },
        ]
    },
    {
        id: "4",
        title: "Negocios",
        courses: [
            { id: "401", title: "Emprendimiento 101", description: "Inicia tu propio negocio." },
            { id: "402", title: "Gestión de Proyectos", description: "Aprende a liderar equipos." },
        ]
    }
];

export default function CursosScreen() {
    const router = useRouter();

    const handleCoursePress = (courseId: string) => {
        router.push(`/cursos/${courseId}`);
    };

    return (
        <ScrollView style={styles.container}>
            {courseSections.map(section => (
                <View key={section.id} style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {section.courses.map(course => (
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
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 16,
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
        width: 250,
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
