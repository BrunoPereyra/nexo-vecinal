import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    Modal,
} from 'react-native';
import { applyToJob } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import VisitedProfileModal from '../modalProfilevisited/VisitedProfileModa';
import colors from '@/style/colors';

export interface JobUserDetails {
    avatar: string;
    id: string;
    nameUser: string;
}

export interface Job {
    id: string;
    title: string;
    description: string;
    tags: string[];
    budget: number;
    status: string;
    userDetails: JobUserDetails;
}

interface JobDetailViewProps {
    job: Job;
    onClose: () => void;
}

const JobDetailView: React.FC<JobDetailViewProps> = ({ job, onClose }) => {
    const { token } = useAuth();
    const [proposal, setProposal] = useState('');
    const [price, setPrice] = useState('');
    const [showInputs, setShowInputs] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const handleApply = async () => {
        if (!showInputs) {
            setShowInputs(true);
            return;
        }
        if (proposal.trim().length < 10 || proposal.trim().length > 100) {
            Alert.alert("Error", "La propuesta debe tener entre 10 y 100 caracteres");
            return;
        }
        const numericPrice = parseInt(price, 10);
        if (isNaN(numericPrice) || numericPrice < 100 || numericPrice > 10000000) {
            Alert.alert("Error", "El precio debe estar entre 100 y 10,000,000");
            return;
        }
        const res = await applyToJob(job.id, proposal, numericPrice, token as string);
        if (res && res.message === 'Applied to job successfully') {
            Alert.alert("Postulación enviada", "Has postulado exitosamente a este trabajo.");
            onClose();
        } else {
            Alert.alert("Error", res?.error || "Ocurrió un error al postularse");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Empleador: al tocar, abre modal del perfil */}
            {job.userDetails && (
                <TouchableOpacity
                    style={styles.employerContainer}
                    onPress={() => setShowProfileModal(true)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarPlaceholder}>
                        {job.userDetails.avatar ? (
                            <Image source={{ uri: job.userDetails.avatar }} style={styles.avatar} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {job.userDetails.nameUser.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.employerName}>{job.userDetails.nameUser}</Text>
                </TouchableOpacity>
            )}

            <View style={styles.card}>
                <Text style={styles.title}>{job.title}</Text>
                <Text style={styles.description}>{job.description}</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Presupuesto:</Text>
                    <Text style={styles.value}>${job.budget}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Estado:</Text>
                    <Text style={styles.value}>{job.status}</Text>
                </View>
                <View style={styles.tagsContainer}>
                    {job.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {showInputs && (
                <View style={styles.applyForm}>
                    <TextInput
                        placeholder="Ingresa tu propuesta (10-100 caracteres)"
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={proposal}
                        onChangeText={setProposal}
                    />
                    <TextInput
                        placeholder="Ingresa el precio (100 - 10,000,000)"
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />
                </View>
            )}

            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>
                    {showInputs ? "Enviar Propuesta" : "Postularme al Trabajo"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>

            {/* Modal para mostrar el perfil del empleador */}
            <Modal
                visible={showProfileModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowProfileModal(false)}
            >
                <View style={styles.profileModalContainer}>
                    <VisitedProfileModal
                        visible={showProfileModal}
                        onClose={() => setShowProfileModal(false)}
                        userId={job.userDetails.id}
                    />
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: colors.background, // "#FFFFFF"
        flexGrow: 1,
    },
    employerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.cream, // "#FFF8DC"
        borderRadius: 8,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.gold, // "#FFD700"
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: colors.textDark, // "#333"
        fontSize: 24,
        fontWeight: "bold",
    },
    employerName: {
        fontSize: 18,
        color: colors.textDark, // "#333"
        fontWeight: "bold",
    },
    card: {
        backgroundColor: colors.warmWhite, // "#FAF9F6"
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: colors.textMuted, // "#888"
        marginBottom: 20,
        lineHeight: 22,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textDark, // "#333"
        marginRight: 8,
    },
    value: {
        fontSize: 16,
        color: colors.textMuted, // "#888"
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 8,
    },
    tag: {
        backgroundColor: colors.cream, // "#FFF8DC"
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: colors.textDark, // "#333"
    },
    applyForm: {
        marginBottom: 20,
    },
    input: {
        height: 45,
        borderColor: colors.gold, // "#FFD700"
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
        backgroundColor: colors.background, // "#FFFFFF"
        color: colors.textDark, // "#333"
    },
    applyButton: {
        backgroundColor: colors.gold, // "#FFD700"
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 20,
    },
    applyButtonText: {
        color: colors.textDark, // "#333"
        fontSize: 16,
        fontWeight: "bold",
    },
    closeButton: {
        alignItems: "center",
        padding: 10,
    },
    closeButtonText: {
        color: colors.gold, // "#FFD700"
        fontSize: 16,
    },
    profileModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0)",
        justifyContent: "center",
        alignItems: "center",
    },
});


export default JobDetailView;
