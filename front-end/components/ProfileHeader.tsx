// /components/ProfileHeader.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type ProfileHeaderProps = {
    user: any; // Puedes definir un tipo más específico según tu estructura de usuario
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    return (
        <View style={styles.container}>
            <Image source={{ uri: user.Avatar }} style={styles.avatar} />
            <Text style={styles.fullName}>{user.FullName}</Text>
            <Text style={styles.username}>@{user.NameUser}</Text>
            <Text style={styles.username}>{user.biography}</Text>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 10,
    },
    fullName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    username: {
        fontSize: 16,
        color: 'gray',
    },
});
