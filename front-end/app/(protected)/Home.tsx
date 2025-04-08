import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Animated
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JobsFeed from "@/components/jobs/JobsFeed";
import PostsFeed from "@/components/Posts/PostsFeed";
import colors from "@/style/colors";

const Home: React.FC = () => {
  const [activeFeed, setActiveFeed] = useState<"jobs" | "posts">("jobs");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  // Animated value para el indicador de la pestaña activa:
  const indicatorAnim = useRef(new Animated.Value(0)).current; // 0: Trabajos, 1: Publicaciones

  // Cargar el avatar desde AsyncStorage
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const storedAvatar = await AsyncStorage.getItem("avatar");
        setAvatar(storedAvatar);
      } catch (err) {
        console.error("Error cargando el avatar:", err);
      } finally {
        setLoadingAvatar(false);
      }
    };
    loadAvatar();
  }, []);

  // Cuando se cambie la pestaña, animar el indicador
  useEffect(() => {
    Animated.timing(indicatorAnim, {
      toValue: activeFeed === "jobs" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeFeed, indicatorAnim]);

  // La interpolación del indicador: asumiendo 2 pestañas de ancho igual (50% cada una)
  const indicatorLeft = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["5%", "55%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {loadingAvatar ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>U</Text>
              </View>
            )
          )}
        </View>
        <Image source={require('@/assets/images/adaptive-icon.png')} style={styles.logo} />
        <View style={{ width: 40, height: 40 }}>

        </View>
      </View>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveFeed("jobs")}
        >
          <Text style={[styles.tabButtonText, activeFeed === "jobs" && styles.activeTabText]}>
            Trabajos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveFeed("posts")}
        >
          <Text style={[styles.tabButtonText, activeFeed === "posts" && styles.activeTabText]}>
            Publicaciones
          </Text>
        </TouchableOpacity>
        {/* Indicador animado */}
        <Animated.View style={[styles.indicator, { left: indicatorLeft }]} />
      </View>
      <View style={styles.feedContainer}>
        {activeFeed === "jobs" ? <JobsFeed /> : <PostsFeed />}
      </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: "contain",
  },
  tabsContainer: {
    flexDirection: "row",
    position: "relative",
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabButtonText: {
    fontSize: 16,
    color: colors.textDark,
  },
  activeTabText: {
    fontWeight: "bold",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: "40%", // Cada pestaña ocupa 50% del ancho
    height: 2,
    backgroundColor: colors.gold,
  },
  feedContainer: {
    flex: 1,
  },
});

export default Home;
