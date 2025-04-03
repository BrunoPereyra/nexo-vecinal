import React, { useState } from "react";
import { Modal, TouchableOpacity, Image, StyleSheet, Dimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FullScreenImageCarouselModalProps {
    visible: boolean;
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

const FullScreenImageCarouselModal: React.FC<FullScreenImageCarouselModalProps> = ({
    visible,
    images,
    initialIndex = 0,
    onClose,
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { width, height } = Dimensions.get("window");
    const maxWidth = width * 0.9;
    const maxHeight = height * 0.9;

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const goNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
                <View style={styles.carouselContainer}>
                    {images.length > 1 && currentIndex > 0 && (
                        <TouchableOpacity style={styles.leftButton} onPress={goPrev}>
                            <Ionicons name="chevron-back-outline" size={36} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <Image
                        source={{ uri: images[currentIndex] }}
                        style={[styles.fullImage, { maxWidth, maxHeight }]}
                        resizeMode="contain"
                    />
                    {images.length > 1 && currentIndex < images.length - 1 && (
                        <TouchableOpacity style={styles.rightButton} onPress={goNext}>
                            <Ionicons name="chevron-forward-outline" size={36} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
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
    carouselContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    fullImage: {
        width: "100%",
        height: "100%",
    },
    leftButton: {
        position: "absolute",
        left: 10,
        zIndex: 2,
    },
    rightButton: {
        position: "absolute",
        right: 10,
        zIndex: 2,
    },
});

export default FullScreenImageCarouselModal;
