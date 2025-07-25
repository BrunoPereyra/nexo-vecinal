import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Modal,
  Button
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UsersFeed from "@/components/userCards/UsersFeed";
import colors from "@/style/colors";
import SubscriptionSection from "@/components/Subscription/SubscriptionSection";
import { FontAwesome5 } from "@expo/vector-icons";

const Home: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"trabajadores">("trabajadores");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [showPromoBanner, setShowPromoBanner] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);

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

  useEffect(() => {
    const loadTabsFromCache = async () => {
      try {
        const cachedSection = await AsyncStorage.getItem("lastActiveSection");
        if (cachedSection === "trabajadores") {
          setActiveSection(cachedSection);
        }
      } catch (err) {
        // Ignorar errores de cache
      }
    };
    loadTabsFromCache();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("lastActiveSection", activeSection);
  }, [activeSection]);

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
            return;
          }
        }
        const lastDismissedTimestamp = parseInt(lastDismissed, 10);
        const now = Date.now();
        const threeDaysLater = lastDismissedTimestamp + 1 * 24 * 60 * 60 * 1000;
        if (now >= threeDaysLater) {
          setShowPromoBanner(true);
        } else {
          setShowPromoBanner(false);
        }
      } catch (err) {
        console.error("Error comprobando estado del banner:", err);
        setShowPromoBanner(true);
      }
    };

    checkBannerStatus();
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
          {/* Aquí podrías mostrar el avatar */}
        </View>
        <Image source={require('@/assets/images/logo-nexovecinal-transparente.png')} style={styles.logo} />
        <View style={{ width: 40, height: 40 }} />
      </View>

      {/* Solo el tab de Trabajadores */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={styles.mainTabButton}
          onPress={() => setActiveSection("trabajadores")}
        >
          <FontAwesome5 name="users" size={17} color={colors.textDark} />
          <Text style={[styles.mainTabText, styles.activeMainTabText]}>
            Trabajadores
          </Text>
          <View style={styles.tabUnderline} />
        </TouchableOpacity>
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
        onRequestClose={() => setSubscriptionVisible(false)}
      >
        <Button
          title="Cerrar"
          onPress={() => setSubscriptionVisible(false)}
          color={colors.errorRed}
        />
        <View style={styles.modalOverlaySubscription}>
          <View style={styles.modalContentSubscription}>
            <SubscriptionSection averageRating={4} jobsCompleted={24} />
          </View>
        </View>
      </Modal>

      <View style={styles.feedContainer}>
        <UsersFeed />
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

  // Main Tabs (Trabajos / Trabajadores)
  mainTabsContainer: {
    flexDirection: "row",
    marginBottom: 10,
    // borderRadius: 8,
    backgroundColor: colors.warmWhite,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
  },
  mainTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    backgroundColor: "transparent",
    position: "relative",
  },
  mainTabText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600",
    marginLeft: 7,
  },
  activeMainTabText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: 18,
    right: 18,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  tabIcon: {
    marginRight: 6,
  },
  // Sub Tabs (Para ti / Trabajos)
  subTabsContainer: {
    flexDirection: "row",
    overflow: "hidden",
    height: 26,
  },
  subTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    backgroundColor: "transparent",
    position: "relative",
    height: "100%",
  },
  activeSubTab: {
    backgroundColor: colors.cream,
  },
  subTabText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
    marginLeft: 4,
  },
  activeSubTabText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  subTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },

  feedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 0,
    paddingTop: 4,
  },

  promoBanner: {
    backgroundColor: colors.gold,
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  promoText: {
    color: colors.textDark,
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  closeButton: {
    backgroundColor: colors.errorRed,
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