import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/style/colors';

type ProfileHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
    };
};

export const ProfileVisitedHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleLongPress = () => {
        setModalVisible(true);
    };

    return (
        <>

            <View style={styles.container}>
                <View style={styles.topRow}>
                    <TouchableOpacity onLongPress={handleLongPress}>
                        <Image source={{ uri: user.Avatar }} style={styles.avatar} />
                    </TouchableOpacity>
                    <View style={styles.infoContainer}>
                        <Text style={styles.fullName}>{user.FullName}</Text>
                        <Text style={styles.username}>@{user.NameUser}</Text>
                    </View>
                </View>
                <Text style={styles.biography}>{user.biography}</Text>
            </View>

            {/* Modal para mostrar el avatar ampliado */}
            {
                user.Avatar && (

                    <Modal
                        visible={modalVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                onPress={() => setModalVisible(false)}
                            >
                                <Image source={{ uri: user.Avatar }} style={styles.fullAvatar} />
                            </TouchableOpacity>
                        </View>
                    </Modal>
                )
            }
        </>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    container: {
        backgroundColor: "transparent",
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: colors.gold, // "#FFD700"
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
    },
    fullName: {
        fontSize: 22,
        fontWeight: "bold",
        color: colors.textDark, // "#E0E0E0"
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        marginBottom: 8,
    },
    biography: {
        fontSize: 14,
        color: colors.textDark, // "#B0B0B0"
        textAlign: "left",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    fullAvatar: {
        width: 300,
        height: 300,
        resizeMode: "contain",
        borderRadius: 1000,
    },
});


export default ProfileVisitedHeader;
