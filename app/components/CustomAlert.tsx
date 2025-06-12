import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface CustomAlertProps {
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
}

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, message, type = 'info' }) => {
    if (!visible) return null;
    return (
        <View style={[
            styles.container,
            type === 'success' && styles.success,
            type === 'error' && styles.error,
            type === 'info' && styles.info,
        ]}>
            <Text style={styles.text}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        zIndex: 1000,
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
    },
    success: {
        backgroundColor: '#4CAF50',
    },
    error: {
        backgroundColor: '#F44336',
    },
    info: {
        backgroundColor: '#2196F3',
    },
});

export default CustomAlert;