// components/Posts/CommentItem.tsx
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import colors from "@/style/colors";

interface CommentItemProps {
    comment: {
        id: string;
        text: string;
        userDetail: {
            id: string;
            nameUser: string;
            avatar: string;
        };
    };
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
    const { text, userDetail } = comment;
    return (
        <View style={styles.container}>
            <Image
                source={{ uri: userDetail?.avatar || "https://via.placeholder.com/40" }}
                style={styles.avatar}
            />
            <View style={styles.textContainer}>
                <Text style={styles.userName}>
                    {userDetail?.nameUser || "Desconocido"}
                </Text>
                <Text style={styles.commentText}>{text}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.cream,
        padding: 8,
        borderRadius: 8,
        marginBottom: 6,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
    },
    textContainer: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: "bold",
        color: colors.textDark,
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        color: colors.textDark,
    },
});

export default CommentItem;
