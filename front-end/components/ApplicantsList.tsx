import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { assignJob, reassignJob } from '../services/JobsService';
import { useRouter } from 'expo-router';

// Interfaces para tipar la información
interface User {
    id: string;
    nameUser: string;
    avatar: string;
}

interface JobDetails {
    id: string;
    status: string;
    applicants: User[];
    assignedTo?: User;
}

interface ApplicantsListProps {
    job: JobDetails;
    token: string;
}

const ApplicantsList: React.FC<ApplicantsListProps> = ({ job, token }) => {
    const router = useRouter();
    const handleAssign = async (workerId: string) => {
        try {
            if (job.assignedTo) {
                // Si ya hay un trabajador asignado, se reasigna el job
                const res = await reassignJob(job.id, workerId, token);
            } else {
                // Si no hay asignado, se asigna al postulante seleccionado
                const res = await assignJob(job.id, workerId, token);
            }
            // Aquí podrías refrescar los datos o actualizar el estado local si es necesario
        } catch (error) {
            console.error('Error al asignar/reasignar el job:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Postulantes</Text>
            {job.applicants.map((applicant: User) => (
                <View key={applicant.id} style={styles.applicantContainer}>
                    <TouchableOpacity
                    >
                        <Image source={{ uri: applicant.avatar }} style={styles.avatar} />

                    </TouchableOpacity>
                    <Text style={styles.applicantName}>{applicant.nameUser}</Text>
                    {job.status !== 'completed' && (
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleAssign(applicant.id)}
                        >
                            <Text style={styles.buttonText}>
                                {job.assignedTo ? 'Reasignar' : 'Asignar'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}
            {job.assignedTo && (
                <View style={styles.assignedContainer}>
                    <Text style={styles.assignedTitle}>Trabajador asignado</Text>
                    <View style={styles.applicantContainer}>
                        <Image source={{ uri: job.assignedTo.avatar }} style={styles.avatar} />
                        <Text style={styles.applicantName}>{job.assignedTo.nameUser}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#BB86FC', // Color personalizado para el título
    },
    applicantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#444', // Color de la línea inferior
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    applicantName: {
        fontSize: 16,
        color: '#03DAC5', // Color personalizado para el nombre del postulante
    },
    button: {
        marginLeft: 'auto',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#1E88E5',
        borderRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    assignedContainer: {
        marginTop: 16,
    },
    assignedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#CF6679', // Color personalizado para el título de la sección asignada
    },
});

export default ApplicantsList;
