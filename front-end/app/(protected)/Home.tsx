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
        // Ajusta la key según donde guardes tus filtros
        const saved = await AsyncStorage.getItem('mySavedFilters');
        if (saved) {
          const filters: FilterParams = JSON.parse(saved);
          // Llama a handleSearch si existe una ubicación
          if (filters.location) {
            await handleSearch(filters);
          }
        }
      } catch (error) {
        console.error('Error loading saved filters:', error);
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
