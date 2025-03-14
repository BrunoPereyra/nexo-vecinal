import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Dimensions } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/context/AuthContext";
import { EditAvatar } from "@/services/userService";
import { MaterialIcons } from "@expo/vector-icons";

type ProfileAdminHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
    };
};

const windowWidth = Dimensions.get("window").width;

export const ProfileAdminHeader: React.FC<ProfileAdminHeaderProps> = ({ user }) => {
    const { token } = useAuth();
    const [avatar, setAvatar] = useState(user.Avatar);

    const handleAvatarEdit = async () => {
        // 1️⃣ Pedir permisos solo para la galería
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (libraryStatus !== "granted") {
            Alert.alert("Permiso denegado", "Se necesitan permisos para acceder a la galería.");
            return;
        }

        // 2️⃣ Preguntar al usuario si quiere elegir de la galería
        Alert.alert(
            "Seleccionar avatar",
            "¿Quieres elegir una imagen de la galería?",
            [
                {
                    text: "Galería",
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 1,
                        });
                        if (!result.canceled) {
                            await processImage(result.assets[0].uri);
                        }
                    },
                },
                { text: "Cancelar", style: "cancel" },
            ]
        );
    };

    // Función auxiliar para procesar la imagen antes de enviarla
    const processImage = async (uri: string) => {
        try {
            const resized = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 612, height: 612 } }],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
            );

            const cropPercentage = 0.05;
            const offset = Math.floor(612 * cropPercentage);
            const newDimension = 612 - 2 * offset;

            const cropped = await ImageManipulator.manipulateAsync(
                resized.uri,
                [
                    {
                        crop: {
                            originX: offset,
                            originY: offset,
                            width: newDimension,
                            height: newDimension,
                        },
                    },
                ],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
            );

            const response = await EditAvatar(cropped.uri, token as string);
            if (response && response.avatar) {
                setAvatar(response.avatar);
            } else {
                Alert.alert("Error", "No se pudo actualizar el avatar");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Ocurrió un error al procesar la imagen.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={handleAvatarEdit} style={styles.avatarContainer}>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                    <View style={styles.editIcon}>
                        <MaterialIcons name="edit" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                    <Text style={styles.fullName}>{user.FullName}</Text>
                    <Text style={styles.username}>@{user.NameUser}</Text>
                </View>
            </View>
            <Text style={styles.biography}>
                {user.biography || "Sin descripción"}
            </Text>
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
    avatarContainer: {
        position: "relative",
        backgroundColor: "#fff",
        borderRadius: 50,
        width: 100,
        height: 100,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#03DAC5",
    },
    avatar: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    editIcon: {
        position: "absolute",
        top: 5,
        right: 5,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: 10,
        padding: 4,
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
        minWidth: windowWidth * 0.9,
        padding: 8,
    },
});
