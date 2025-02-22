import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
} from 'react-native';

interface FeedbackSectionProps {
    jobDetail: any;
    // En modo "employer" se usa currentUserId para validar; en "worker" siempre se muestra el formulario.
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
    // Si es "worker", siempre se muestra el formulario.
    const showFeedbackForm =
        mode === 'worker' || (mode === 'employer' && currentUserId === jobDetail.userId);

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

    return (
        <View style={styles.feedbackContainer}>
            {/* Feedback del Empleador */}
            <Text style={styles.sectionTitle}>Feedback del Empleador:</Text>
            {jobDetail.employerFeedback ? (
                <View style={styles.existingFeedbackContainer}>
                    <Text style={styles.feedbackText}>
                        Comentario: {jobDetail.employerFeedback.comment}
                    </Text>
                    <Text style={styles.feedbackText}>
                        Calificación: {jobDetail.employerFeedback.rating}{' '}
                        {jobDetail.employerFeedback.rating === 1 ? 'estrella' : 'estrellas'}
                    </Text>
                    <Text style={styles.feedbackText}>
                        Fecha: {new Date(jobDetail.employerFeedback.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            ) : (
                <Text style={styles.feedbackText}>
                    Aún no se ha dejado feedback del empleador.
                </Text>
            )}

            {/* Feedback del Trabajador */}
            <Text style={styles.sectionTitle}>Feedback del Trabajador:</Text>
            {jobDetail.workerFeedback ? (
                <View style={styles.existingFeedbackContainer}>
                    <Text style={styles.feedbackText}>
                        Comentario: {jobDetail.workerFeedback.comment}
                    </Text>
                    <Text style={styles.feedbackText}>
                        Calificación: {jobDetail.workerFeedback.rating}{' '}
                        {jobDetail.workerFeedback.rating === 1 ? 'estrella' : 'estrellas'}
                    </Text>
                    <Text style={styles.feedbackText}>
                        Fecha: {new Date(jobDetail.workerFeedback.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            ) : (
                <Text style={styles.feedbackText}>
                    Aún no se ha dejado feedback del trabajador.
                </Text>
            )}

            {/* Formulario para dejar/actualizar feedback */}
            {showFeedbackForm && (
                <>
                    <Text style={styles.sectionTitle}>{formTitle}</Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingLabel}>Calificación:</Text>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Text style={[styles.star, star <= rating ? styles.selectedStar : styles.unselectedStar]}>
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
    feedbackText: {
        fontSize: 16,
        marginBottom: 4,
        color: '#E0E0E0',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
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
    },
    feedbackButtonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
