import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJobsByFilters } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import JobCard from '@/components/JobCardHome';
import JobSearchFilters, { FilterParams } from '@/components/jobCards/JobSearchFilters';
import JobDetailView, { Job } from '@/components/jobCards/JobDetailView';

let savedScrollOffset = 0;

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

  // 1. Función para buscar trabajos según los filtros
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
      console.error('Error fetching jobs:', error);
    }
  };

  // 2. Efecto para restaurar la posición del scroll
  useEffect(() => {
    if (flatListRef.current && savedScrollOffset > 0) {
      flatListRef.current.scrollToOffset({ offset: savedScrollOffset, animated: false });
    }
  }, []);

  // 3. Efecto para cargar y usar los filtros guardados
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        console.log("Cargando filtros guardados...");

        // Recuperar valores desde AsyncStorage
        const cachedTitle = await AsyncStorage.getItem('searchTitle');
        const cachedTags = await AsyncStorage.getItem('selectedTags');
        const cachedLocation = await AsyncStorage.getItem('location');
        const cachedRadius = await AsyncStorage.getItem('radius');

        // Convertir a formato JSON si no son nulos
        const parsedTags = cachedTags ? JSON.parse(cachedTags) : [];
        const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
        const parsedRadius = cachedRadius ? JSON.parse(cachedRadius) : null;

        // Construir el objeto de filtros
        const filters: FilterParams = {
          searchTitle: cachedTitle || '',
          selectedTags: parsedTags,
          location: parsedLocation,
          radius: parsedRadius || 10, // Valor por defecto si no hay radio guardado
        };

        console.log("Filtros recuperados:", filters);

        // Ejecutar búsqueda si hay una ubicación guardada
        if (filters.location) {
          await handleSearch(filters);
        }
      } catch (error) {
        console.error('Error cargando los filtros guardados:', error);
      }
    };

    loadSavedFilters();
  }, [token]);


  return (
    <View style={styles.container}>
      {/* Componente de filtros */}
      <JobSearchFilters onSearch={handleSearch} />

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
  container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 16 },
  listContainer: { paddingBottom: 16 },
});

export default Home;
