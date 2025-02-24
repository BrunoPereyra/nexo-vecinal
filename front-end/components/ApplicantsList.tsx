import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { assignJob, reassignJob } from '../services/JobsService';
import { useRouter } from 'expo-router';

// Interfaces para tipar la información
interface User {
    id: string;
    nameUser: string;
    avatar: string;
}

interface Applicant {
    applicantId: string;
    appliedAt: string;
    // Se admite que la información del precio venga de dos formas:
    price?: number;
    priceObject?: { price?: number };
    proposal: string;
    userData?: User;
}

interface JobDetails {
    id: string;
    status: string;
    applicants: Applicant[];
    assignedTo?: Applicant; // Puede no tener userData, se buscará en applicants
}

interface ApplicantsListProps {
    job: JobDetails;
    token: string;
}

const ApplicantsList: React.FC<ApplicantsListProps> = ({ job, token }) => {
    const router = useRouter();

    const handleAssign = async (workerId: string) => {
        try {
            if (job.assignedTo && job.assignedTo.applicantId !== "000000000000000000000000") {
                const res = await reassignJob(job.id, workerId, token);
                console.log(res);

            } else {
                await assignJob(job.id, workerId, token);
            }
            // Aquí podrías refrescar los datos o actualizar el estado local si es necesario
        } catch (error) {
            console.error('Error al asignar/reasignar el job:', error);
        }
    };

    if (!job || !job.applicants) {
        return <Text>Cargando...</Text>;
    }

    // Para el trabajador asignado, si no viene userData, se busca en los applicants
    const assignedUserData =
        job.assignedTo &&
        (job.assignedTo.userData ||
            job.applicants.find(
                (applicant) => applicant.applicantId === job.assignedTo?.applicantId
            )?.userData);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Postulantes</Text>
            {job.applicants.map((applicant) => {
                // Extraer el precio, ya sea que venga directamente o desde priceObject
                const price =
                    applicant.price !== undefined
                        ? applicant.price
                        : applicant.priceObject?.price;
                return (
                    <View key={applicant.applicantId} style={styles.applicantContainer}>
                        <TouchableOpacity>
                            {applicant.userData && applicant.userData.avatar ? (
                                <Image source={{ uri: applicant.userData.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.placeholderAvatar} />
                            )}
                        </TouchableOpacity>
                        <View style={styles.infoContainer}>
                            <Text style={styles.applicantName}>
                                {applicant.userData ? applicant.userData.nameUser : 'Usuario desconocido'}
                            </Text>
                            <Text style={styles.proposalText}>Propuesta: {applicant.proposal}</Text>
                            <Text style={styles.priceText}>
                                Precio: ${price !== undefined ? price : 'N/A'}
                            </Text>
                        </View>
                        {job.status !== 'completed' && (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => handleAssign(applicant.applicantId)}
                            >
                                <Text style={styles.buttonText}>
                                    {job.assignedTo && job.assignedTo.applicantId !== "000000000000000000000000"
                                        ? 'Reasignar'
                                        : 'Asignar'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
            {job.assignedTo && (
                <View style={styles.assignedContainer}>
                    <Text style={styles.assignedTitle}>Trabajador asignado</Text>
                    <View style={styles.applicantContainer}>
                        {assignedUserData && assignedUserData.avatar ? (
                            <Image source={{ uri: assignedUserData.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.placeholderAvatar} />
                        )}
                        <View style={styles.infoContainer}>
                            <Text style={styles.applicantName}>
                                {assignedUserData ? assignedUserData.nameUser : 'Información no disponible'}
                            </Text>
                            <Text style={styles.proposalText}>
                                Propuesta: {job.assignedTo.proposal || 'N/A'}
                            </Text>
                            <Text style={styles.priceText}>
                                Precio: ${job.assignedTo.price !== undefined ? job.assignedTo.price : job.assignedTo.priceObject?.price || 'N/A'}
                            </Text>
                        </View>
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
        color: '#BB86FC',
    },
    applicantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    placeholderAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
        backgroundColor: '#666',
    },
    infoContainer: {
        flex: 1,
    },
    applicantName: {
        fontSize: 16,
        color: '#03DAC5',
    },
    proposalText: {
        fontSize: 14,
        color: '#CCCCCC',
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
        color: '#CF6679',
    },
});

export default ApplicantsList;
