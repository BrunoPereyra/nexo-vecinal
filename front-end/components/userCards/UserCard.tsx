import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import colors from "@/style/colors";

const UserCard = ({ user, onPress }: { user: any, onPress: () => void }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <Image source={{ uri: user.Avatar }} style={styles.avatar} />
        <View>
            <Text style={styles.name}>{user.NameUser}</Text>
            <View style={styles.tagsContainer}>
                {user.tags?.map((tag: string, idx: number) => (
                    <View key={idx} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                    </View>
                ))}
            </View>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 14,
        backgroundColor: colors.cream,
    },
    name: {
        fontWeight: "bold",
        fontSize: 17,
        color: colors.textDark,
        marginBottom: 6,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    tagChip: {
        backgroundColor: colors.cream,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        color: colors.textDark,
        fontSize: 12,
        fontWeight: "500",
    },
});
export default UserCard;