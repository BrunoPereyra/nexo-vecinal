// SupportChatsList.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { getSupportConversations } from "@/services/supportChat";

export interface User {
  id: string;
  NameUser: string;
  Avatar: string;
}

export interface Conversation {
  User: User;
  lastMessage: {
    text: string;
    createdAt: string;
  };
}

interface SupportChatsListProps {
  token: string;
  onConversationPress: (conversation: Conversation) => void;
}

const SupportChatsList: React.FC<SupportChatsListProps> = ({ token, onConversationPress }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const convs = await getSupportConversations(token);
        setConversations(convs);

      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, [token]);

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.conversationItem} onPress={() => onConversationPress(item)}>
      <Text style={styles.conversationTitle}>
        Chat con {item.User?.NameUser}
      </Text>
      <Text style={styles.conversationText}>Último mensaje: {item.lastMessage.text}</Text>
      <Text style={styles.conversationDate}>
        {new Date(item.lastMessage.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#03DAC5" />;
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.User?.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 16,
    backgroundColor: "#121212",
  },
  conversationItem: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E0E0E0",
    marginBottom: 4,
  },
  conversationText: {
    fontSize: 16,
    color: "#E0E0E0",
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 12,
    color: "#777",
  },
});

export default SupportChatsList;
