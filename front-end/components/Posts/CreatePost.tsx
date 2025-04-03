import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createPost } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import colors from "@/style/colors";

interface CreatePostProps {
    visible: boolean;
    onClose: () => void;
    onPostCreated?: (post: any) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ visible, onClose, onPostCreated }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permiso denegado", "Necesitas permisos para acceder a la galería");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled && result.assets.length > 0) {
            if (images.length < 3) {
                setImages([...images, result.assets[0].uri]);
            } else {
                Alert.alert("Límite alcanzado", "Solo puedes subir hasta 3 imágenes");
            }
        }
    };


    const handleCreatePost = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert("Error", "El título y la descripción son obligatorios");
            return;
        }
        setLoading(true);
        const postData: any = {
            title,
            description,
            tags: [], // Si tienes etiquetas, envialas aquí
            images,  // Enviamos el array de URIs para las imágenes
        };

        try {
            const res = await createPost(postData, token as string);
            console.log(res);
            if (res?.message === "Post created successfully") {
                Alert.alert("Éxito", "Post creado correctamente");
                onClose();
                setTitle("");
                setDescription("");
                setImages([]);
                onPostCreated?.(res.post);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    style={styles.modalContent}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="always"

                    >
                        <Text style={styles.modalTitle}>Crear nuevo post</Text>
                        <TextInput
                            placeholder="Título"
                            value={title}
                            onChangeText={setTitle}
                            style={styles.input}
                            placeholderTextColor="#888"
                        />
                        <TextInput
                            placeholder="Descripción"
                            value={description}
                            onChangeText={setDescription}
                            style={[styles.input, styles.multilineInput]}
                            multiline
                            placeholderTextColor="#888"
                        />
                        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                            <Text style={styles.imageButtonText}>Agregar imagen</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal style={styles.imagesPreviewContainer} keyboardShouldPersistTaps="always"
                        >
                            {images.map((uri, index) => (
                                <Image key={index} source={{ uri }} style={styles.previewImage} />
                            ))}
                        </ScrollView>
                    </ScrollView>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleCreatePost}>
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.textDark} />
                            ) : (
                                <Text style={styles.modalButtonText}>Crear</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );

};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: colors.background,
        width: "90%",
        maxHeight: "80%",
        borderRadius: 12,
        overflow: "hidden",
    },
    scrollContainer: { padding: 16 },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.textDark,
        textAlign: "center",
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        color: colors.textDark,
        backgroundColor: colors.warmWhite,
    },
    multilineInput: { height: 80, textAlignVertical: "top" },
    imageButton: {
        backgroundColor: colors.cream,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 12,
    },
    imageButtonText: { color: colors.textDark, fontWeight: "bold" },
    imagesPreviewContainer: { marginBottom: 12 },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 8,
    },
    modalButtons: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: colors.borderLight,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        alignItems: "center",
    },
    modalButtonText: { fontSize: 16, fontWeight: "bold", color: colors.gold },
});

export default CreatePost;
