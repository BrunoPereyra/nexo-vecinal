
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatJobss() {
  return (
    <View style={chatStyles.container}>
      <Text style={chatStyles.title}>Chat</Text>
      <Text style={chatStyles.subtitle}>Aquí se implementará el chat...</Text>
    </View>
  );
}

const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0E0E0'
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 8
  }
});
