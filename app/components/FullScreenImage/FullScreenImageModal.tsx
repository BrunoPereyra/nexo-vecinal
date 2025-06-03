import React from "react";
import { Modal, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";

interface FullScreenImageModalProps {
    visible: boolean;
    uri: string;
    onClose: () => void;
}

const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({ visible, uri, onClose }) => {
    const { width, height } = Dimensions.get("window");
    const maxWidth = width * 0.9;
    const maxHeight = height * 0.9;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
                <Image source={{ uri }} style={[styles.fullImage, { maxWidth, maxHeight }]} resizeMode="contain" />
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    fullImage: {
        width: "100%",
        height: "100%",
    },
});

export default FullScreenImageModal;
