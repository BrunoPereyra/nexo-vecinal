import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ProfileHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
        // Otros campos si es necesario
    };
};

export const ProfileVisitedHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    return (
        <LinearGradient
            colors={["#0f2027", "#203a43", "#2c5364"]}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
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
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    container: {
        backgroundColor: 'transparent', // Transparente para ver el degradado
        padding: 16,
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
