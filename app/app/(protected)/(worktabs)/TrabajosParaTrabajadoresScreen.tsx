import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Button
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JobsFeed from "@/components/jobs/JobsFeed";
import RecommendedJobsFeed from "@/components/recommendedJobs/RecommendedJobsFeed";
import colors from "@/style/colors";
import SubscriptionSection from "@/components/Subscription/SubscriptionSection";

export default function TrabajosParaTrabajadoresScreen() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<"para ti" | "jobs">("para ti");
  const [showPromoBanner, setShowPromoBanner] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);


  useEffect(() => {
    const loadTabsFromCache = async () => {
      try {
        const cachedJobTab = await AsyncStorage.getItem("lastActiveJobTab");
        if (cachedJobTab === "para ti" || cachedJobTab === "jobs") {
          setActiveJobTab(cachedJobTab);
        }
      } catch (err) {
        // Ignorar errores de cache
      }
    };
    loadTabsFromCache();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("lastActiveJobTab", activeJobTab);
  }, [activeJobTab]);

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
    } catch (err) { }
  };


  return (
    <View style={styles.container}>
      {/* Sub-tabs SOLO para la sección Trabajos */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            activeJobTab === "para ti" && styles.activeSubTab,
          ]}
          onPress={() => setActiveJobTab("para ti")}
        >
          <Text style={[
            styles.subTabText,
            activeJobTab === "para ti" && styles.activeSubTabText
          ]}>
            Para ti
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            activeJobTab === "jobs" && styles.activeSubTab,
          ]}
          onPress={() => setActiveJobTab("jobs")}
        >
          <Text style={[
            styles.subTabText,
            activeJobTab === "jobs" && styles.activeSubTabText
          ]}>
            Trabajos
          </Text>
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
        {activeJobTab === "para ti" && <RecommendedJobsFeed />}
        {activeJobTab === "jobs" && <JobsFeed />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subTabsContainer: {
    flexDirection: "row",
    overflow: "hidden",
    height: 26,
    marginTop: 10,
    marginBottom: 10,
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
