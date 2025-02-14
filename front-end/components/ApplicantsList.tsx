import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { assignJob, reassignJob } from '../services/JobsService';

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
    const handleAssign = async (workerId: string) => {
        try {
            console.log(job);

            if (job.assignedTo) {
                // Si ya hay un trabajador asignado, se reasigna el job
                console.log(job.id, workerId, token);
                const res = await reassignJob(job.id, workerId, token);
                console.log('Job reasignado:', res);
            } else {
                // Si no hay asignado, se asigna al postulante seleccionado
                const res = await assignJob(job.id, workerId, token);
                console.log(res);
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
                    <Image
                        source={{ uri: applicant.avatar }}
                        style={styles.avatar}
                    />
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
                        <Image
                            source={{ uri: job.assignedTo.avatar }}
                            style={styles.avatar}
                        />
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
    },
    applicantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    applicantName: {
        fontSize: 16,
    },
    button: {
        marginLeft: 'auto',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#007AFF',
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
    },
});

export default ApplicantsList;
