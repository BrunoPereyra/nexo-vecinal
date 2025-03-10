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
    const [employerFeedbackExpanded, setEmployerFeedbackExpanded] = useState(false);
    const [workerFeedbackExpanded, setWorkerFeedbackExpanded] = useState(false);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);

    const canLeaveFeedback = mode === 'worker' || (mode === 'employer' && currentUserId === jobDetail.userId);

    const formTitle =
        mode === 'employer'
            ? jobDetail.employerFeedback
                ? 'Actualizar tu Feedback:'
                : 'Deja tu Feedback:'
            : jobDetail.workerFeedback
                ? 'Actualizar tu Feedback:'
                : 'Deja tu Feedback:';

    const buttonText =
        mode === 'employer'
            ? jobDetail.employerFeedback
                ? 'Actualizar Feedback'
                : 'Enviar Feedback'
            : jobDetail.workerFeedback
                ? 'Actualizar Feedback'
                : 'Enviar Feedback';

    const renderStars = (starCount: number) => {
        return (
            <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Text style={[styles.star, star <= starCount ? styles.selectedStar : styles.unselectedStar]}>
                            ★
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.feedbackCard}>
            {/* Sección de feedback existente */}
            {jobDetail.employerFeedback && (
                <>
                    <View style={styles.existingFeedback}>
                        <View style={styles.feedbackHeader}>
                            {renderStars(jobDetail.employerFeedback.rating)}
                            <Text style={styles.uploader}>Empleador</Text>
                            <TouchableOpacity onPress={() => setEmployerFeedbackExpanded(!employerFeedbackExpanded)}>
                                <Text style={styles.toggleText}>{employerFeedbackExpanded ? 'Ocultar' : 'Ver más'}</Text>
                            </TouchableOpacity>
                        </View>
                        {employerFeedbackExpanded && (
                            <View style={styles.feedbackContent}>
                                <Text style={styles.feedbackComment}>
                                    {jobDetail.employerFeedback.comment}
                                </Text>
                                <Text style={styles.feedbackDate}>
                                    {new Date(jobDetail.employerFeedback.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </>
            )}

            {jobDetail.workerFeedback && (
                <>
                    <View style={styles.existingFeedback}>
                        <View style={styles.feedbackHeader}>
                            {renderStars(jobDetail.workerFeedback.rating)}
                            <Text style={styles.uploader}>Trabajador</Text>
                            <TouchableOpacity onPress={() => setWorkerFeedbackExpanded(!workerFeedbackExpanded)}>
                                <Text style={styles.toggleText}>{workerFeedbackExpanded ? 'Ocultar' : 'Ver más'}</Text>
                            </TouchableOpacity>
                        </View>
                        {workerFeedbackExpanded && (
                            <View style={styles.feedbackContent}>
                                <Text style={styles.feedbackComment}>
                                    {jobDetail.workerFeedback.comment}
                                </Text>
                                <Text style={styles.feedbackDate}>
                                    {new Date(jobDetail.workerFeedback.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </>
            )}

            {/* Formulario para dejar o actualizar feedback */}
            {canLeaveFeedback && (
                <View style={styles.feedbackForm}>
                    {!showFeedbackInput ? (
                        <TouchableOpacity style={styles.feedbackButton} onPress={() => setShowFeedbackInput(true)}>
                            <Text style={styles.feedbackButtonText}>Dejar Feedback</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <Text style={styles.formTitle}>{formTitle}</Text>
                            <View style={styles.ratingSection}>
                                <Text style={styles.ratingLabel}>Calificación:</Text>
                                {renderStars(rating)}
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Escribe tu feedback..."
                                placeholderTextColor="#888"
                                value={feedback}
                                onChangeText={setFeedback}
                                multiline
                            />
                            <TouchableOpacity style={styles.feedbackButton} onPress={handleLeaveFeedback} disabled={actionLoading}>
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
    feedbackCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 10,
        padding: 16,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginBottom: 8,
    },
    existingFeedback: {
        backgroundColor: '#121212',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,


    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    uploader: {
        fontSize: 16,
        color: '#CCCCCC',
        flex: 1,
        marginHorizontal: 8,
    },
    toggleText: {
        fontSize: 14,
        color: '#03DAC5',
    },
    feedbackContent: {
        marginTop: 8,
    },
    feedbackComment: {
        fontSize: 16,
        color: '#CCCCCC',
    },
    feedbackDate: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    feedbackForm: {
        marginTop: 12,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#CCCCCC',
        marginBottom: 8,
    },
    ratingSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    ratingLabel: {
        fontSize: 16,
        color: '#CCCCCC',
        marginRight: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 10,
        minHeight: 60,
        color: '#CCCCCC',
        backgroundColor: '#121212',
        marginBottom: 12,
    },
    feedbackButton: {
        backgroundColor: '#121212',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#03DAC5',
    },
    feedbackButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#CCCCCC',
    },
});

export default FeedbackSection;
