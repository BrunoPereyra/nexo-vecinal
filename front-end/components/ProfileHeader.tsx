import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type ProfileHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
        // Otros campos si es necesario
    };
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <Image source={{ uri: user.Avatar }} style={styles.avatar} />
                <View style={styles.infoContainer}>
                    <Text style={styles.fullName}>{user.FullName}</Text>
                    <Text style={styles.username}>@{user.NameUser}</Text>
                </View>
            </View>
            <Text style={styles.biography}>{user.biography}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#03DAC5',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
    },
    fullName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: '#03DAC5',
        marginBottom: 8,
    },
    biography: {
        fontSize: 14,
        color: '#B0B0B0',
        textAlign: 'left',
    },
});
