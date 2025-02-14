// ../styles/darkStyles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        backgroundColor: '#121212',
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    assignedCandidateCard: {
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    candidateCard: {
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    candidateName: {
        fontSize: 16,
        color: '#ffffff',
        marginRight: 16,
    },
    detail: {
        fontSize: 14,
        color: '#aaaaaa',
        marginVertical: 8,
    },
    completeButton: {
        backgroundColor: '#bb86fc',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 16,
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    feedbackContainer: {
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
    },
    existingFeedbackContainer: {
        backgroundColor: '#333333',
        padding: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    feedbackText: {
        color: '#ffffff',
        fontSize: 14,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    ratingLabel: {
        color: '#ffffff',
        fontSize: 16,
        marginRight: 8,
    },
    star: {
        fontSize: 24,
        marginHorizontal: 4,
    },
    selectedStar: {
        color: '#ffeb3b',
    },
    unselectedStar: {
        color: '#555555',
    },
    feedbackInput: {
        backgroundColor: '#333333',
        color: '#ffffff',
        borderRadius: 4,
        padding: 8,
        marginBottom: 8,
        height: 80,
        textAlignVertical: 'top',
    },
    feedbackButton: {
        backgroundColor: '#bb86fc',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    feedbackButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
