import React, { useState, useEffect } from 'react';
import { LayoutAnimation, UIManager, Platform, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { assignJob, reassignJob, } from '../services/JobsService';
import { useRouter } from 'expo-router';
import colors from '@/style/colors';
import { getRecommendedWorkers } from '@/services/userService';

// Habilitar animaciones en Android
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
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
    // Eliminamos "recommended" ya que la consultaremos mediante el endpoint.
    assignedTo?: Applicant;
    tags: []
}

interface ApplicantsListProps {
    job: any;
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
            {expanded &&
                (scrollable ? (
                    <ScrollView
                        style={[styles.sectionContent, fixedHeight ? { height: fixedHeight } : {}]}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        scrollEnabled={true}
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={styles.sectionContent}>{children}</View>
                ))}
        </View>
    );
};

const ApplicantsList: React.FC<ApplicantsListProps> = ({ job, token }) => {
    const router = useRouter();
    const [recommendedWorkers, setRecommendedWorkers] = useState<User[]>([]);

    useEffect(() => {
        async function fetchRecommended() {
            try {
                const geoPoint = {
                    type: "Point",
                    coordinates: [job.location.coordinates[0], job.location.coordinates[1]], // [longitud, latitud]
                };
                let parsedTags = job.tags;

                if (Array.isArray(parsedTags) && parsedTags.length === 1 && typeof parsedTags[0] === "string" && parsedTags[0].startsWith("[")) {
                    parsedTags = JSON.parse(parsedTags[0]);
                }


                const res = await getRecommendedWorkers(
                    token,
                    1,
                    geoPoint,
                    150000,
                    parsedTags

                );

                if (res && res.recommendedUsers) {
                    setRecommendedWorkers(res.recommendedUsers);
                }
            } catch (error) {
                console.error("Error fetching recommended workers:", error);
            }
        }

        fetchRecommended();
    }, [token, job]);

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
    const handleAssignforce = async (workerId: string) => {
        try {

            await assignJob(job.id, workerId, token);
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
                (applicant: any) => applicant.applicantId === job.assignedTo?.applicantId
            )?.userData);

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

    // Render for recommended users (modified)
    const renderRecommendedItem = (user: User) => {
        return (
            <View key={user.id} style={styles.applicantContainer}>
                <TouchableOpacity
                    onPress={() => {
                        if (user.id) {
                            router.push(`/profile/ProfileVisited?id=${user.id}`);
                        }
                    }}
                >
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.placeholderAvatar} />
                    )}
                </TouchableOpacity>
                <View style={styles.infoContainer}>
                    <Text style={styles.applicantName}>{user.nameUser}</Text>
                </View>
                {job.status !== 'completed' && (
                    <TouchableOpacity style={styles.assignButton} onPress={() => handleAssignforce(user.id)}>
                        <Text style={styles.assignButtonText}>
                            Assignar
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };


    return (
        <View style={styles.container}>
            {/* Sección de Postulantes */}
            <CollapsibleSection title="Postulantes" fixedHeight={200}>
                {job.applicants.length > 0 ? (
                    job.applicants.map(renderApplicantItem)
                ) : (
                    <Text style={styles.noDataText}>No hay postulantes</Text>
                )}
            </CollapsibleSection>

            {/* Sección de Recomendados, usando la consulta al endpoint */}
            <CollapsibleSection title="Recomendados" fixedHeight={200}>
                {recommendedWorkers.length > 0 ? (
                    recommendedWorkers.map(renderRecommendedItem)
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
                                Precio: ${job.assignedTo.price !== undefined
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
        backgroundColor: colors.background, // "#FFFFFF"
    },
    sectionContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.cream, // "#FFF8DC"
        borderWidth: 1,
        borderColor: colors.borderLight, // "#EAE6DA"
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: colors.cream,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },
    sectionHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark, // "#333"
    },
    expandIcon: {
        fontSize: 18,
        color: colors.textDark,
    },
    sectionContent: {
        padding: 12,
        backgroundColor: colors.cream,
    },
    applicantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
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
        backgroundColor: colors.borderLight,
    },
    infoContainer: {
        flex: 1,
    },
    applicantName: {
        fontSize: 16,
        color: colors.textDark,
        marginBottom: 2,
        fontWeight: 'bold',
    },
    proposalText: {
        fontSize: 14,
        color: colors.textMuted, // "#888"
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.gold, // "#FFD700"
    },
    assignButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.gold, // "#FFD700"
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    assignButtonText: {
        color: colors.textDark,
        fontSize: 14,
    },
    assignedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    noDataText: {
        color: colors.textMuted,
        textAlign: 'center',
        padding: 8,
    },
});



export default ApplicantsList;
