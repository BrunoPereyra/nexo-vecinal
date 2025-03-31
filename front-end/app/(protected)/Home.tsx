import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import JobsFeed from "@/components/jobs/JobsFeed";
import PostsFeed from "@/components/Posts/PostsFeed";
import colors from "@/style/colors";

const Home: React.FC = () => {
  const [activeFeed, setActiveFeed] = useState<"jobs" | "posts">("jobs");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeFeed === "jobs" && styles.toggleButtonActive,
          ]}
          onPress={() => setActiveFeed("jobs")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeFeed === "jobs" && styles.toggleButtonTextActive,
            ]}
          >
            Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            activeFeed === "posts" && styles.toggleButtonActive,
          ]}
          onPress={() => setActiveFeed("posts")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeFeed === "posts" && styles.toggleButtonTextActive,
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>
      </View>
      {activeFeed === "jobs" ? <JobsFeed /> : <PostsFeed />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: colors.warmWhite,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: colors.cream,
  },
  toggleButtonActive: {
    backgroundColor: colors.gold,
  },
  toggleButtonText: {
    fontSize: 16,
    color: colors.textDark,
  },
  toggleButtonTextActive: {
    fontWeight: "bold",
  },
});

export default Home;
