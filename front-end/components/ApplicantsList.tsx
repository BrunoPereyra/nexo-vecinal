import React, { useState } from 'react';
import { LayoutAnimation, UIManager, Platform, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { assignJob, reassignJob } from '../services/JobsService';
import { useRouter } from 'expo-router';

// Habilitar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Interfaces para tipar la información
interface User {
    id: string;
    nameUser: string;
    avatar: string;
}

interface Applicant {
    applicantId: string;
    appliedAt: string;
    price?: number;
    priceObject?: { price?: number };
    proposal: string;
    userData?: User;
}

interface JobDetails {
    id: string;
    status: string;
    applicants: Applicant[];
    recommended?: Applicant[];
    assignedTo?: Applicant;
}

interface ApplicantsListProps {
    job: JobDetails;
    token: string;
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    scrollable?: boolean;
    fixedHeight?: number;
}

// Componente para secciones colapsables con animación y scroll
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, scrollable = true, fixedHeight }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.sectionContainer}>
            <TouchableOpacity onPress={toggleSection} style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
                <Text style={styles.expandIcon}>{expanded ? '-' : '+'}</Text>
            </TouchableOpacity>
            {expanded && (
                scrollable ? (
                    <ScrollView
                        style={[styles.sectionContent, fixedHeight ? { height: fixedHeight } : {}]}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        scrollEnabled={true}
                    >
                        {children}
                    </ScrollView>

                ) : (
                    <View style={styles.sectionContent}>
                        {children}
                    </View>
                )
            )}
        </View>
    );
};

const ApplicantsList: React.FC<ApplicantsListProps> = ({ job, token }) => {
    const router = useRouter();

    const handleAssign = async (workerId: string) => {
        try {
            if (job.assignedTo && job.assignedTo.applicantId !== "000000000000000000000000") {
                await reassignJob(job.id, workerId, token);
            } else {
                await assignJob(job.id, workerId, token);
            }
            // Actualiza datos o estado local si es necesario
        } catch (error) {
            console.error('Error al asignar/reasignar el job:', error);
        }
    };

    if (!job || !job.applicants) {
        return <Text>Cargando...</Text>;
    }

    // Para el trabajador asignado, si no viene userData, se busca en applicants
    const assignedUserData =
        job.assignedTo &&
        (job.assignedTo.userData ||
            job.applicants.find(
                (applicant) => applicant.applicantId === job.assignedTo?.applicantId
            )?.userData);

    // Función para renderizar cada item (aplica tanto a postulantes como a recomendados)
    const renderApplicantItem = (applicant: Applicant) => {
        const price =
            applicant.price !== undefined
                ? applicant.price
                : applicant.priceObject?.price;
        return (
            <View key={applicant.applicantId} style={styles.applicantContainer}>
                <TouchableOpacity
                    onPress={() => {
                        if (applicant.userData && applicant.userData.id) {
                            router.push(`/profile/ProfileVisited?id=${applicant.userData.id}`);
                        }
                    }}
                >
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
                    <Text style={styles.priceText}>Precio: ${price !== undefined ? price : 'N/A'}</Text>
                </View>
                {job.status !== 'completed' && (
                    <TouchableOpacity style={styles.assignButton} onPress={() => handleAssign(applicant.applicantId)}>
                        <Text style={styles.assignButtonText}>
                            {job.assignedTo && job.assignedTo.applicantId !== "000000000000000000000000" ? 'Reasignar' : 'Asignar'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sección de Postulantes con contenedor de altura fija (80 unidades) para mostrar 1 elemento a la vez */}
            <CollapsibleSection title="Postulantes" fixedHeight={200}>
                {job.applicants.length > 0 ? (
                    job.applicants.map(renderApplicantItem)
                ) : (
                    <Text style={styles.noDataText}>No hay postulantes</Text>
                )}
            </CollapsibleSection>

            {/* Sección de Recomendados con contenedor de altura fija (80 unidades) */}
            <CollapsibleSection title="Recomendados" fixedHeight={80}>
                {job.recommended && job.recommended.length > 0 ? (
                    job.recommended.map(renderApplicantItem)
                ) : (
                    <Text style={styles.noDataText}>No hay recomendados</Text>
                )}
            </CollapsibleSection>

            {/* Sección de Trabajador asignado sin scroll */}
            <CollapsibleSection title="Trabajador asignado" scrollable={false}>
                {job.assignedTo ? (
                    <View style={styles.assignedContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                if (assignedUserData && assignedUserData.id) {
                                    router.push(`/profile/ProfileVisited?id=${assignedUserData.id}`);
                                }
                            }}
                        >
                            {assignedUserData && assignedUserData.avatar ? (
                                <Image source={{ uri: assignedUserData.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.placeholderAvatar} />
                            )}
                        </TouchableOpacity>
                        <View style={styles.infoContainer}>
                            <Text style={styles.applicantName}>
                                {assignedUserData ? assignedUserData.nameUser : 'Información no disponible'}
                            </Text>
                            <Text style={styles.proposalText}>
                                Propuesta: {job.assignedTo.proposal || 'N/A'}
                            </Text>
                            <Text style={styles.priceText}>
                                Precio: $
                                {job.assignedTo.price !== undefined
                                    ? job.assignedTo.price
                                    : job.assignedTo.priceObject?.price || 'N/A'}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noDataText}>No hay trabajador asignado</Text>
                )}
            </CollapsibleSection>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#121212',
    },
    sectionContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#333',
    },
    sectionHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    expandIcon: {
        fontSize: 18,
        color: '#FFF',
    },
    sectionContent: {
        padding: 12,
        backgroundColor: '#222',
    },
    applicantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    placeholderAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#555',
    },
    infoContainer: {
        flex: 1,
    },
    applicantName: {
        fontSize: 16,
        color: '#BB86FC',
        marginBottom: 2,
    },
    proposalText: {
        fontSize: 14,
        color: '#AAAAAA',
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    assignButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#1E88E5',
        borderRadius: 4,
    },
    assignButtonText: {
        color: '#FFF',
        fontSize: 14,
    },
    assignedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    noDataText: {
        color: '#888',
        textAlign: 'center',
        padding: 8,
    },
});

export default ApplicantsList;
