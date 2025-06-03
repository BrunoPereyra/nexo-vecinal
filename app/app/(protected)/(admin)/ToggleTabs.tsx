import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

type AdminTab = 'reports' | 'courses' | 'support' | 'jobs' | "Users";

type ToggleTabsProps = {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void; // Ahora incluye 'jobs'
};

const ToggleTabs: React.FC<ToggleTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <ScrollView horizontal contentContainerStyle={styles.scrollContainer}>
            <TouchableOpacity
                style={[styles.button, activeTab === 'reports' && styles.activeButton]}
                onPress={() => onTabChange('reports')}
            >
                <Text style={[styles.text, activeTab === 'reports' && styles.activeText]}>
                    Reportes
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, activeTab === 'courses' && styles.activeButton]}
                onPress={() => onTabChange('courses')}
            >
                <Text style={[styles.text, activeTab === 'courses' && styles.activeText]}>
                    Cursos
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, activeTab === 'support' && styles.activeButton]}
                onPress={() => onTabChange('support')}
            >
                <Text style={[styles.text, activeTab === 'support' && styles.activeText]}>
                    Chats de Soporte
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, activeTab === 'jobs' && styles.activeButton]}
                onPress={() => onTabChange('jobs')}
            >
                <Text style={[styles.text, activeTab === 'jobs' && styles.activeText]}>
                    Jobs
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, activeTab === 'jobs' && styles.activeButton]}
                onPress={() => onTabChange('Users')}
            >
                <Text style={[styles.text, activeTab === 'Users' && styles.activeText]}>
                    Usuarios
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default ToggleTabs;

const styles = StyleSheet.create({
    scrollContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginVertical: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#444',
        marginHorizontal: 5, // Espaciado entre botones
    },
    activeButton: {
        backgroundColor: '#03DAC5',
        borderColor: '#03DAC5',
    },
    text: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    activeText: {
        color: '#121212',
        fontWeight: 'bold',
    },
});