import React, { useState, useRef } from "react";
import {
    Animated,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/context/AuthContext";
import { EditAvatar } from "@/services/userService";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "@/style/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const [modalVisible, setModalVisible] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const animateScale = (toValue: number) => {
        Animated.timing(scaleAnim, {
            toValue,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

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
                        aspect: [1, 1],
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

    const handleAvatarLongPress = () => {
        setModalVisible(true);
    };

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
                await AsyncStorage.setItem('avatar', response.avatar);
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
        <>

            <View style={styles.centerContainer}>
                {/* Avatar con animación de escala */}
                <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: scaleAnim }] }]}>
                    <TouchableOpacity
                        onPress={handleAvatarEdit}
                        onLongPress={handleAvatarLongPress}
                        onPressIn={() => animateScale(0.95)}
                        onPressOut={() => animateScale(1)}
                        activeOpacity={0.8}
                    >
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                        <View style={styles.editIcon}>
                            <MaterialIcons name="edit" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Nombre y Usuario */}
                <Text style={styles.fullName}>{user.FullName || "Sin Nombre"}</Text>
                <Text style={styles.username}>@{user.NameUser || "usuario"}</Text>

                {/* Biografía */}
                {!!user.biography && (
                    <Text style={styles.biography}>{user.biography}</Text>
                )}
            </View>

            {/* Modal para mostrar el avatar en grande */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={1}
                >
                    <Image source={{ uri: avatar }} style={styles.fullAvatar} />
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    coverGradient: {
        width: "100%",
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        backgroundColor: colors.cream, // "#FFF8DC"
    },
    centerContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarWrapper: {
        width: 110,
        height: 110,
        marginBottom: 12,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 55,
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
    fullName: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark, // "#333"
        marginBottom: 4,
        textAlign: "center",
    },
    username: {
        fontSize: 16,
        color: colors.gold, // "#FFD700"
        fontStyle: "italic",
        marginBottom: 8,
        textAlign: "center",
    },
    biography: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textMuted, // "#888"
        textAlign: "center",
        marginHorizontal: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.8)", // Fondo claro con transparencia
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

export default ProfileAdminHeader;
