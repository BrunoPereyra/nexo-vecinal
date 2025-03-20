import React, { useState, useRef, useEffect } from "react";
import { View, FlatList, StyleSheet, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getJobsByFilters } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import JobCard from "@/components/JobCardHome";
import JobSearchFilters, { FilterParams } from "@/components/jobCards/JobSearchFilters";
import JobDetailView, { Job } from "@/components/jobCards/JobDetailView";

let savedScrollOffset = 0;

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

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
          location: parsedLocation,
          radius: parsedRadius || 10,
        };

        if (filters.location) {
          await handleSearch(filters);
        }
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
    backgroundColor: "#0f2027", // Fondo principal
  },
  filterContainer: {
    backgroundColor: "#203a43", // Contenedor secundario
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#2c5364", // Borde para separar la sección
  },
  listContainer: {
    padding: 16,
    paddingBottom: 16,
  },
});

export default Home;
