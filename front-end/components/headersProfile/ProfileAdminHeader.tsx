import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { EditAvatar } from "@/services/userService";

type ProfileAdminHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
        // Otros campos si es necesario
    };
};

export const ProfileAdminHeader: React.FC<ProfileAdminHeaderProps> = ({ user }) => {
    const { token } = useAuth();
    const [avatar, setAvatar] = useState(user.Avatar);

    const handleAvatarEdit = async () => {
        // Pedir permisos si es necesario
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permiso denegado", "Se necesitan permisos para acceder a la galería.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            // Llamada al servicio para editar avatar
            const response = await EditAvatar(result.assets[0].uri, token as string);
            if (response && response.avatar) {
                setAvatar(response.avatar);
            } else {
                Alert.alert("Error", "No se pudo actualizar el avatar");
            }
        }

    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={handleAvatarEdit}>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                </TouchableOpacity>
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
        backgroundColor: "#1E1E1E",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
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
        borderColor: "#03DAC5",
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
    },
    fullName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#E0E0E0",
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: "#03DAC5",
        marginBottom: 8,
    },
    biography: {
        fontSize: 14,
        color: "#B0B0B0",
        textAlign: "left",
    },
});
