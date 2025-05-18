import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Animated,
  Modal,
  Button
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JobsFeed from "@/components/jobs/JobsFeed";
import PostsFeed from "@/components/Posts/PostsFeed";
import colors from "@/style/colors";
import SubscriptionSection from "@/components/Subscription/SubscriptionSection";
import RecommendedJobsFeed from "@/components/recommendedJobs/RecommendedJobsFeed";
import UsersFeed from "@/components/userCards/UsersFeed";

const Home: React.FC = () => {
  const [activeFeed, setActiveFeed] = useState<"jobs" | "Trabajadores" | "para ti">("jobs");

  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const indicatorAnim = useRef(new Animated.Value(0)).current;

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
    const tabIndex = activeFeed === "para ti" ? 0 : activeFeed === "jobs" ? 1 : 2;
    Animated.timing(indicatorAnim, {
      toValue: tabIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeFeed, indicatorAnim]);

  // La interpolación del indicador: asumiendo 2 pestañas de ancho igual (50% cada una)
  const indicatorLeft = indicatorAnim.interpolate({
    inputRange: [0, 1, 2], // Índices de las pestañas
    outputRange: ["0%", "33.33%", "66.66%"], // Posiciones de las pestañas
  });
  // promo banner
  const [showPromoBanner, setShowPromoBanner] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);

  useEffect(() => {
    const checkBannerStatus = async () => {
      try {

        const lastDismissed = await AsyncStorage.getItem('promoBannerDismissedAt');
        if (!lastDismissed) {
          setShowPromoBanner(true);
          return;
        }
        const premiumDataJson = await AsyncStorage.getItem('userPremiumData');
        if (premiumDataJson) {
          const premiumData = JSON.parse(premiumDataJson);
          if (new Date(premiumData.SubscriptionEnd).getTime() > Date.now()) {
            setShowPromoBanner(false);
            return
          }
        }

        const lastDismissedTimestamp = parseInt(lastDismissed, 10);
        const now = Date.now();
        const threeDaysLater = lastDismissedTimestamp + 3 * 24 * 60 * 60 * 1000;

        if (now >= threeDaysLater) {
          setShowPromoBanner(true);
        } else {
          setShowPromoBanner(false);
        }
      } catch (err) {
        console.error("Error comprobando estado del banner:", err);
      }
    };

    checkBannerStatus();

    const intervalId = setInterval(checkBannerStatus, 10 * 1000); // Revisar cada 10 segundos

    return () => clearInterval(intervalId); // Limpiar cuando se destruya el componente
  }, []);


  const dismissPromoBanner = async () => {
    try {
      const now = Date.now().toString();
      await AsyncStorage.setItem('promoBannerDismissedAt', now);
      setShowPromoBanner(false);
    } catch (err) {
      console.error("Error ocultando el banner:", err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {/* {loadingAvatar ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>U</Text>
              </View>
            )
          )} */}
        </View>
        <Image source={require('@/assets/images/logo-nexovecinal-transparente.png')} style={styles.logo} />
        <View style={{ width: 40, height: 40 }}>

        </View>
      </View>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveFeed("para ti")}
        >
          <Text style={[styles.tabButtonText, activeFeed === "para ti" && styles.activeTabText]}>
            Para ti
          </Text>
        </TouchableOpacity>

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
          onPress={() => setActiveFeed("Trabajadores")}
        >
          <Text style={[styles.tabButtonText, activeFeed === "Trabajadores" && styles.activeTabText]}>
            Trabajadores
          </Text>
        </TouchableOpacity>

        <Animated.View style={[styles.indicator, { left: indicatorLeft }]} />
      </View>
      {showPromoBanner && (
        <TouchableOpacity style={styles.promoBanner} onPress={() => setSubscriptionVisible(true)}>
          <Text style={styles.promoText}>
            ¡Aumenta tus oportunidades de trabajo con la versión Premium!
          </Text>
          <TouchableOpacity onPress={dismissPromoBanner} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <Modal
        visible={subscriptionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubscriptionVisible(false)} // Cierra el modal al presionar atrás
      >
        <Button
          title="Cerrar"
          onPress={() => setSubscriptionVisible(false)}
          color={colors.gold}
        />
        <View style={styles.modalOverlaySubscription}>
          <View style={styles.modalContentSubscription}>
            <SubscriptionSection isSubscribed={false} averageRating={4} jobsCompleted={24} />

          </View>
        </View>
      </Modal>
      <View style={styles.feedContainer}>
        {activeFeed === "jobs" && <JobsFeed />}
        {activeFeed === "Trabajadores" && <UsersFeed />}
        {activeFeed === "para ti" && <RecommendedJobsFeed />}
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
    paddingTop: 10,
    backgroundColor: colors.background,
  },
  avatarContainer: {
    width: 20,
    height: 20,
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
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: "cover",
    borderRadius: 30,
    overflow: "hidden",
  },
  tabsContainer: {
    flexDirection: "row",
    position: "relative",
    zIndex: 100,
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
    width: "33.33%", // Cada pestaña ocupa un tercio del ancho
    height: 2,
    backgroundColor: colors.cream,
  },
  feedContainer: {
    flex: 1,
  },
  // Promo Banner Styles
  promoBanner: {
    backgroundColor: colors.cream, // O el color que prefieras
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoText: {
    color: colors.textDark,
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlaySubscription: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentSubscription: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 20
  },

});

export default Home;
