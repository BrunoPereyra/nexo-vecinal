// app/(protected)/cursos/CreateCourseScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { createCourse, CreateCourseRequest } from '@/services/cursos';

export default function CreateCourseScreen() {
    const router = useRouter();
    const { token } = useAuth();

    // Estados para la información del curso
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    // Estados para enlaces opcionales
    const [instagram, setInstagram] = useState('');
    const [youtube, setYoutube] = useState('');
    const [website, setWebsite] = useState('');
    const [twitter, setTwitter] = useState('');
    // Nuevos estados para code, seccion y fechas
    const [code, setCode] = useState('');
    const [seccion, setSeccion] = useState('');
    const [campaignStart, setCampaignStart] = useState('');
    const [campaignEnd, setCampaignEnd] = useState('');
    // Función auxiliar para convertir "DD-MM-YYYY" a ISO (asumiendo hora 00:00:00 UTC)
    const convertDateToISO = (dateStr: string): string => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) {
            throw new Error("Formato de fecha inválido. Use DD-MM-YYYY");
        }
        const [day, month, year] = parts;
        // Creamos la fecha usando el formato YYYY-MM-DD
        const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
        if (isNaN(date.getTime())) {
            throw new Error("Fecha inválida");
        }
        return date.toISOString();
    };

    const handleSubmit = async () => {
        if (!title || !description || !content || !code || !seccion || !campaignStart || !campaignEnd) {
            Alert.alert('Error', 'Por favor, complete todos los campos obligatorios.');
            return;
        }
        let isoStart: string, isoEnd: string;
        try {
            isoStart = convertDateToISO(campaignStart);
            isoEnd = convertDateToISO(campaignEnd);
        } catch (error: any) {
            Alert.alert('Error', error.message);
            return;
        }
        const newCourse: CreateCourseRequest = {
            title,
            description,
            content,
            socials: {
                instagram: instagram || '',
                youtube: youtube || '',
                website: website || '',
                twitter: twitter || '',
            },
            campaignStart: isoStart,
            campaignEnd: isoEnd,
            baneado: false,
            seccion,
            code,
        };

        try {
            await createCourse(newCourse, token as string);
            Alert.alert('Curso creado', 'El curso se ha creado correctamente.');
            router.back();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message);
        }
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
            <Text style={styles.subHeader}>Información adicional</Text>
            <TextInput
                style={styles.input}
                placeholder="Código"
                placeholderTextColor="#B0B0B0"
                value={code}
                onChangeText={setCode}
            />
            <TextInput
                style={styles.input}
                placeholder="Sección"
                placeholderTextColor="#B0B0B0"
                value={seccion}
                onChangeText={setSeccion}
            />
            <TextInput
                style={styles.input}
                placeholder="Fecha de inicio (ISO)"
                placeholderTextColor="#B0B0B0"
                value={campaignStart}
                onChangeText={setCampaignStart}
            />
            <TextInput
                style={styles.input}
                placeholder="Fecha de fin (ISO)"
                placeholderTextColor="#B0B0B0"
                value={campaignEnd}
                onChangeText={setCampaignEnd}
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
