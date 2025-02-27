// app/(protected)/cursos/CreateCourseScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function CreateCourseScreen() {
    const router = useRouter();

    // Estados para la información del curso
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    // Estados para enlaces opcionales
    const [instagram, setInstagram] = useState('');
    const [youtube, setYoutube] = useState('');
    const [website, setWebsite] = useState('');
    const [twitter, setTwitter] = useState('');

    const handleSubmit = () => {
        if (!title || !description || !content) {
            Alert.alert('Error', 'Por favor, complete los campos obligatorios.');
            return;
        }

        const newCourse = {
            title,
            description,
            content,
            socials: {
                instagram: instagram || undefined,
                youtube: youtube || undefined,
                website: website || undefined,
                twitter: twitter || undefined,
            },
        };

        console.log('Nuevo curso:', newCourse);
        Alert.alert('Curso creado', 'El curso se ha creado correctamente.');

        // Aquí podrías llamar a una API para guardar el curso y luego redirigir,
        // por ejemplo: router.push('/adminPanel')
        // Por este ejemplo, solo regresamos al panel.
        router.back();
    };

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.header}>Crear Curso</Text>
            <TextInput
                style={styles.input}
                placeholder="Título del curso"
                placeholderTextColor="#B0B0B0"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Descripción"
                placeholderTextColor="#B0B0B0"
                value={description}
                onChangeText={setDescription}
                multiline
            />
            <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Contenido del curso"
                placeholderTextColor="#B0B0B0"
                value={content}
                onChangeText={setContent}
                multiline
            />
            <Text style={styles.subHeader}>Enlaces adicionales (opcional)</Text>
            <TextInput
                style={styles.input}
                placeholder="Instagram"
                placeholderTextColor="#B0B0B0"
                value={instagram}
                onChangeText={setInstagram}
            />
            <TextInput
                style={styles.input}
                placeholder="YouTube"
                placeholderTextColor="#B0B0B0"
                value={youtube}
                onChangeText={setYoutube}
            />
            <TextInput
                style={styles.input}
                placeholder="Sitio web"
                placeholderTextColor="#B0B0B0"
                value={website}
                onChangeText={setWebsite}
            />
            <TextInput
                style={styles.input}
                placeholder="Twitter"
                placeholderTextColor="#B0B0B0"
                value={twitter}
                onChangeText={setTwitter}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Crear Curso</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 16,
    },
    backButton: {
        marginBottom: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: '#03DAC5',
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 16,
        textAlign: 'center',
    },
    subHeader: {
        fontSize: 18,
        color: '#E0E0E0',
        marginTop: 16,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        padding: 12,
        color: '#E0E0E0',
        marginBottom: 12,
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#121212',
    },
});
