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
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowRecommended((prev) => !prev)}
      >
        <Text style={styles.toggleButtonText}>
          {showRecommended ? "Ocultar" : "Trabajadores recomendados"}
        </Text>
        <Ionicons
          name={showRecommended ? "chevron-up-outline" : "chevron-down-outline"}
          size={18} // reducido
          color="#FFF"
        />
      </TouchableOpacity>

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
    backgroundColor: "#0f2027",
  },
  filterContainer: {
    backgroundColor: "#203a43",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#2c5364",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Color más suave y tamaño reducido
    backgroundColor: "#2c5364", // menos chillón que #03DAC5
    paddingVertical: 4,         // más pequeño
    marginHorizontal: 16,
    borderRadius: 6,            // un poco más pequeño
    marginTop: 8,
    marginBottom: 8,
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 14,    // más pequeño
    marginRight: 6,  // ajustado
  },
  listContainer: {
    padding: 16,
    paddingBottom: 16,
  },
});

export default Home;
