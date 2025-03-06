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
import { useRouter } from 'expo-router';
import { applyToJob } from '../services/JobsService';
import { useAuth } from '@/context/AuthContext';
import VisitedProfileModal from './modalProfilevisited/VisitedProfileModa';

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
    const router = useRouter();
    const { token } = useAuth();
    const [proposal, setProposal] = useState('');
    const [price, setPrice] = useState('');
    const [showInputs, setShowInputs] = useState(false);
    // Estado para controlar el modal del perfil
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
            {/* Al tocar el área del empleador se abre el modal del perfil en lugar de enrutar */}
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
                        userId={job.userDetails.id} // Se pasa el id del usuario
                    />
                </View>
            </Modal>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#121212',
        flexGrow: 1,
    },
    employerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#03DAC5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: '#121212',
        fontSize: 24,
        fontWeight: 'bold',
    },
    employerName: {
        fontSize: 18,
        color: '#E0E0E0',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#B0B0B0',
        marginBottom: 20,
        lineHeight: 22,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E0E0E0',
        marginRight: 8,
    },
    value: {
        fontSize: 16,
        color: '#B0B0B0',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tag: {
        backgroundColor: '#333',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: '#E0E0E0',
    },
    applyForm: {
        marginBottom: 20,
    },
    input: {
        height: 45,
        borderColor: '#03DAC5',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
        color: '#E0E0E0',
        backgroundColor: '#1E1E1E',
    },
    applyButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    applyButtonText: {
        color: '#121212',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        alignItems: 'center',
        padding: 10,
    },
    closeButtonText: {
        color: '#03DAC5',
        fontSize: 16,
    },
    profileModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileModalContent: {
        backgroundColor: '#121212',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    closeProfileButton: {
        alignSelf: 'flex-end',
    },
    closeProfileText: {
        color: '#03DAC5',
        fontSize: 18,
        fontWeight: 'bold',
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginVertical: 10,
    },
    profileName: {
        fontSize: 20,
        color: '#E0E0E0',
        fontWeight: 'bold',
    },
});

export default JobDetailView;
