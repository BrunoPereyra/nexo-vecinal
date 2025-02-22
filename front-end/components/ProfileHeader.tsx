import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type ProfileHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
        // Puedes agregar otros campos según necesites
    };
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                <Image source={{ uri: user.Avatar }} style={styles.avatar} />
            </View>
            <Text style={styles.fullName}>{user.FullName}</Text>
            <Text style={styles.username}>@{user.NameUser}</Text>
            <Text style={styles.biography}>{user.biography}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    avatarContainer: {
        borderWidth: 2,
        borderColor: '#03DAC5',
        borderRadius: 70,
        padding: 3,
        marginBottom: 10,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    fullName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 5,
    },
    username: {
        fontSize: 16,
        color: '#03DAC5',
        marginBottom: 5,
    },
    biography: {
        fontSize: 14,
        color: '#B0B0B0',
        textAlign: 'center',
    },
});
