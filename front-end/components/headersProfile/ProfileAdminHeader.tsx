import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/context/AuthContext";
import { EditAvatar } from "@/services/userService";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ProfileAdminHeaderProps = {
    user: {
        Avatar: string;
        FullName: string;
        NameUser: string;
        biography: string;
    };
};


export const ProfileAdminHeader: React.FC<ProfileAdminHeaderProps> = ({ user }) => {
    const { token } = useAuth();
    const [avatar, setAvatar] = useState(user.Avatar);

    const handleAvatarEdit = async () => {
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryStatus !== "granted") {
            Alert.alert("Permiso denegado", "Se necesitan permisos para acceder a la galería.");
            return;
        }
        Alert.alert("Seleccionar avatar", "¿Quieres elegir una imagen de la galería?", [
            {
                text: "Galería",
                onPress: async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        aspect: [1, 1], // Esto fuerza a que la imagen se mantenga cuadrada
                        quality: 1,
                    });
                    if (!result.canceled) {
                        await processImage(result.assets[0].uri);
                    }
                },
            },
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const processImage = async (uri: string) => {
        try {
            // Redimensiona la imagen a un cuadrado de 612x612 píxeles
            const resized = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 612, height: 612 } }],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
            );
            // Calcula el margen de recorte (5% del ancho)
            const cropPercentage = 0.05;
            const offset = Math.floor(612 * cropPercentage);
            const newDimension = 612 - 2 * offset;

            // Recorta la imagen para quitar los márgenes sobrantes y centrar la imagen
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

            // Envía la imagen recortada al servidor
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
        <LinearGradient
            colors={["#0f2027", "#203a43", "#2c5364"]}
            style={styles.coverGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Fila con avatar y nombres */}
            <View style={styles.topSection}>
                <TouchableOpacity onPress={handleAvatarEdit} style={styles.avatarWrapper}>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                    <View style={styles.editIcon}>
                        <MaterialIcons name="edit" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
                <View style={styles.nameContainer}>
                    <Text style={styles.fullName}>{user.FullName || "Sin Nombre"}</Text>
                    <Text style={styles.username}>@{user.NameUser || "usuario"}</Text>
                </View>
            </View>
            {/* Biografía debajo de la fila */}
            <Text style={styles.biography}>{user.biography || "Sin descripción"}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    coverGradient: {
        width: "100%",
        paddingVertical: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    topSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarWrapper: {
        position: "relative",
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: "#fff",
        overflow: "hidden",
    },
    avatar: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    editIcon: {
        position: "absolute",
        bottom: 5,
        right: 5,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: 10,
        padding: 4,
    },
    nameContainer: {
        marginLeft: 16,
    },
    fullName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: "#fff",
        fontStyle: "italic",
    },
    biography: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
        color: "#B0B0B0",
        textAlign: "left",
    },
});

export default ProfileAdminHeader;
