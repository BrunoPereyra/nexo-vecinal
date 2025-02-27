import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
} from 'react-native';

interface FeedbackSectionProps {
    jobDetail: any;
    currentUserId?: string;
    rating: number;
    feedback: string;
    actionLoading: boolean;
    setRating: (rating: number) => void;
    setFeedback: (feedback: string) => void;
    handleLeaveFeedback: () => void;
    mode: 'employer' | 'worker';
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
    jobDetail,
    currentUserId,
    rating,
    feedback,
    actionLoading,
    setRating,
    setFeedback,
    handleLeaveFeedback,
    mode,
}) => {
    // Estados para controlar la expansión de cada feedback
    const [employerFeedbackExpanded, setEmployerFeedbackExpanded] = useState(false);
    const [workerFeedbackExpanded, setWorkerFeedbackExpanded] = useState(false);
    // Estado para mostrar/ocultar el formulario de feedback
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);

    // Determinar si se debe permitir dejar feedback según el rol
    const canLeaveFeedback = mode === 'worker' || (mode === 'employer' && currentUserId === jobDetail.userId);

    // Títulos y textos del formulario según si ya existe feedback
    const formTitle =
        mode === 'employer'
            ? jobDetail.employerFeedback
                ? 'Actualizar tu Feedback:'
                : 'Dejar tu Feedback:'
            : jobDetail.workerFeedback
                ? 'Actualizar tu Feedback:'
                : 'Dejar tu Feedback:';

    const buttonText =
        mode === 'employer'
            ? jobDetail.employerFeedback
                ? 'Actualizar Feedback'
                : 'Enviar Feedback'
            : jobDetail.workerFeedback
                ? 'Actualizar Feedback'
                : 'Enviar Feedback';

    // Función para renderizar las estrellas
    const renderStars = (starCount: number) => {
        return (
            <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                        key={star}
                        style={[styles.star, star <= starCount ? styles.selectedStar : styles.unselectedStar]}
                    >
                        ★
                    </Text>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.feedbackContainer}>
            {/* Se muestra la sección de Feedback del Empleador solo si existe */}
            {jobDetail.employerFeedback && (
                <>
                    <Text style={styles.sectionTitle}>Feedback del Empleador:</Text>
                    <View style={styles.existingFeedbackContainer}>
                        <View style={styles.feedbackHeader}>
                            {renderStars(jobDetail.employerFeedback.rating)}
                            <Text style={styles.uploaderText}>Subido por: Empleador</Text>
                            <TouchableOpacity
                                onPress={() => setEmployerFeedbackExpanded(!employerFeedbackExpanded)}
                            >
                                <Text style={styles.toggleText}>
                                    {employerFeedbackExpanded ? '▲' : '▼'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {employerFeedbackExpanded && (
                            <>
                                <Text style={styles.feedbackText}>
                                    Comentario: {jobDetail.employerFeedback.comment}
                                </Text>
                                <Text style={styles.feedbackText}>
                                    Fecha: {new Date(jobDetail.employerFeedback.createdAt).toLocaleDateString()}
                                </Text>
                            </>
                        )}
                    </View>
                </>
            )}

            {/* Se muestra la sección de Feedback del Trabajador solo si existe */}
            {jobDetail.workerFeedback && (
                <>
                    <Text style={styles.sectionTitle}>Feedback del Trabajador:</Text>
                    <View style={styles.existingFeedbackContainer}>
                        <View style={styles.feedbackHeader}>
                            {renderStars(jobDetail.workerFeedback.rating)}
                            <Text style={styles.uploaderText}>Subido por: Trabajador</Text>
                            <TouchableOpacity
                                onPress={() => setWorkerFeedbackExpanded(!workerFeedbackExpanded)}
                            >
                                <Text style={styles.toggleText}>
                                    {workerFeedbackExpanded ? '▲' : '▼'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {workerFeedbackExpanded && (
                            <>
                                <Text style={styles.feedbackText}>
                                    Comentario: {jobDetail.workerFeedback.comment}
                                </Text>
                                <Text style={styles.feedbackText}>
                                    Fecha: {new Date(jobDetail.workerFeedback.createdAt).toLocaleDateString()}
                                </Text>
                            </>
                        )}
                    </View>
                </>
            )}

            {/* Formulario para dejar/actualizar feedback */}
            {canLeaveFeedback && (
                <View style={styles.feedbackFormContainer}>
                    {!showFeedbackInput ? (
                        <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => setShowFeedbackInput(true)}
                        >
                            <Text style={styles.feedbackButtonText}>Dejar Feedback</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>{formTitle}</Text>
                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingLabel}>Calificación:</Text>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                        <Text
                                            style={[
                                                styles.star,
                                                star <= rating ? styles.selectedStar : styles.unselectedStar,
                                            ]}
                                        >
                                            ★
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.feedbackInput}
                                placeholder="Escribe tu feedback..."
                                placeholderTextColor="#888"
                                value={feedback}
                                onChangeText={setFeedback}
                                multiline
                            />
                            <TouchableOpacity
                                style={styles.feedbackButton}
                                onPress={handleLeaveFeedback}
                                disabled={actionLoading}
                            >
                                <Text style={styles.feedbackButtonText}>{buttonText}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    feedbackContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 8,
        color: '#03DAC5',
    },
    existingFeedbackContainer: {
        marginBottom: 16,
        padding: 8,
        backgroundColor: '#121212',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#03DAC5',
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    uploaderText: {
        fontSize: 16,
        color: '#E0E0E0',
        marginLeft: 8,
        flex: 1,
    },
    toggleText: {
        fontSize: 20,
        color: '#03DAC5',
        paddingHorizontal: 8,
    },
    feedbackText: {
        fontSize: 16,
        marginTop: 4,
        color: '#E0E0E0',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingLabel: {
        fontSize: 16,
        marginRight: 8,
        color: '#E0E0E0',
    },
    star: {
        fontSize: 24,
        marginHorizontal: 2,
    },
    selectedStar: {
        color: '#03DAC5',
    },
    unselectedStar: {
        color: '#444',
    },
    feedbackFormContainer: {
        marginTop: 16,
    },
    feedbackInput: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 5,
        padding: 8,
        minHeight: 60,
        marginBottom: 10,
        backgroundColor: '#121212',
        color: '#E0E0E0',
    },
    feedbackButton: {
        backgroundColor: '#03DAC5',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 8,
    },
    feedbackButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default FeedbackSection;
