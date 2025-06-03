import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export default function CustomText({ style, ...props }: TextProps) {
    return <Text style={[styles.text, style]} {...props} />;
}

const styles = StyleSheet.create({
    text: {
        fontFamily: 'System', // Fuente predeterminada del sistema
        color: '#E0E0E0', // Color de texto global
        fontSize: 16,
    },
});
