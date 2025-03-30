import React, { useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getJobsByFilters } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import JobCard from "@/components/JobCardHome";
import JobSearchFilters, { FilterParams } from "@/components/jobCards/JobSearchFilters";
import JobDetailView, { Job } from "@/components/jobCards/JobDetailView";
import RecommendedWorkersRow from "@/components/RecommendedWorkersRow";
import { Ionicons } from "@expo/vector-icons";

import colors from "@/style/colors";
let savedScrollOffset = 0;

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

  // Estado para los filtros usados
  const [filterParams, setFilterParams] = useState<FilterParams>({
    searchTitle: "",
    selectedTags: [],
    location: { latitude: -31.4201, longitude: -64.1888 },
    radius: 10,
  });

  // Estado para controlar si se muestra la fila de recomendados
  const [showRecommended, setShowRecommended] = useState<boolean>(false);

  const handleSearch = async (filters: FilterParams) => {


    if (!token || !filters.location) return;
    const apiFilters = {
      tags: filters.selectedTags,
      longitude: filters.location.longitude,
      latitude: filters.location.latitude,
      radius: filters.radius,
      title: filters.searchTitle.trim(),
    };
    try {
      const data = await getJobsByFilters(apiFilters, token);
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  // Restaurar la posición del scroll (opcional)
  useEffect(() => {
    if (flatListRef.current && savedScrollOffset > 0) {
      flatListRef.current.scrollToOffset({
        offset: savedScrollOffset,
        animated: false,
      });
    }
  }, []);

  // Cargar y usar los filtros guardados
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const cachedTitle = await AsyncStorage.getItem("searchTitle");
        const cachedTags = await AsyncStorage.getItem("selectedTags");
        const cachedLocation = await AsyncStorage.getItem("location");
        const cachedRadius = await AsyncStorage.getItem("radius");

        const parsedTags = cachedTags ? JSON.parse(cachedTags) : [];
        const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
        const parsedRadius = cachedRadius ? JSON.parse(cachedRadius) : null;

        const filters: FilterParams = {
          searchTitle: cachedTitle || "",
          selectedTags: parsedTags,
          location: parsedLocation || { latitude: -31.4201, longitude: -64.1888 },
          radius: parsedRadius || 10,
        };
        setFilterParams(filters);
        await handleSearch(filters);
      } catch (error) {
        console.error("Error cargando los filtros guardados:", error);
      }
    };

    loadSavedFilters();
  }, [token]);

  return (
    <View style={styles.container}>
      {/* Contenedor de filtros */}
      <View style={styles.filterContainer}>
        <JobSearchFilters onSearch={handleSearch} />
      </View>

      {/* Botón para mostrar/ocultar recomendados */}
      <View style={styles.recommendedHeader}>
        <Text style={styles.recommendedHeaderText}>
          Trabajadores recomendados
        </Text>
        <TouchableOpacity
          onPress={() => setShowRecommended(!showRecommended)}
          style={styles.iconButton}
        >
          <Ionicons
            name={showRecommended ? "chevron-up-outline" : "chevron-down-outline"}
            size={20}
            color={colors.textDark}
          />
        </TouchableOpacity>
      </View>

      {/* Sección de trabajadores recomendados */}
      {showRecommended && (
        <RecommendedWorkersRow />
      )}

      {/* Lista de trabajos */}
      <FlatList
        ref={flatListRef}
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => setSelectedJob(item)} />
        )}
        contentContainerStyle={styles.listContainer}
      />

      {/* Modal con detalle de un trabajo */}
      <Modal visible={!!selectedJob} animationType="slide">
        {selectedJob && (
          <JobDetailView job={selectedJob} onClose={() => setSelectedJob(null)} />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    backgroundColor: colors.warmWhite,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    paddingVertical: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  toggleButtonText: {
    color: colors.textDark,
    fontSize: 14,
    marginRight: 6,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  recommendedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  recommendedHeaderText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "bold",
  },
  iconButton: {
    padding: 6,
  },
});

export default Home;
