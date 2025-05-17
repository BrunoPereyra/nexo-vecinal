import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import colors from "@/style/colors";

const UserDetailView = ({ user, onClose }: { user: any, onClose: () => void }) => (
    <View style={styles.container}>
        <Image source={{ uri: user.Avatar }} style={styles.avatar} />
        <Text style={styles.name}>{user.NameUser}</Text>
        <Text style={styles.tags}>{user.tags?.join(", ")}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
    name: { fontWeight: "bold", fontSize: 22, color: colors.textDark, marginBottom: 8 },
    tags: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
    closeButton: { padding: 12, backgroundColor: colors.gold, borderRadius: 8 },
    closeButtonText: { color: colors.textDark, fontWeight: "bold" },
});
export default UserDetailView;