import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import colors from "@/style/colors";

const UserCard = ({ user, onPress }: { user: any, onPress: () => void }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Image source={{ uri: user.Avatar }} style={styles.avatar} />
        <View>
            <Text style={styles.name}>{user.NameUser}</Text>
            <Text style={styles.tags}>{user.tags?.join(", ")}</Text>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: colors.cream, borderRadius: 8, marginBottom: 8 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
    name: { fontWeight: "bold", fontSize: 16, color: colors.textDark },
    tags: { color: colors.textMuted, fontSize: 12 },
});
export default UserCard;