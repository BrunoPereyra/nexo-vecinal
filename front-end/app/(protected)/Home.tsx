// /app/(protected)/Home.tsx
import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Dimensions
} from 'react-native';
import { getJobsByFilters } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import JobCard from '@/components/JobCard';
import Navbar from '@/components/Navbar';
import JobSearchFilters from '@/components/JobSearchFilters';

interface FilterParams {
  searchTitle: string;
  selectedTags: string[];
  trianglePoints: { latitude: number; longitude: number }[];
  location: { latitude: number; longitude: number } | null;
  radius: number;
}

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);

  // Función que se ejecuta cuando se hace búsqueda en el componente de filtros
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
      console.log('Jobs:', data);
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* <Navbar /> */}
      <JobSearchFilters onSearch={handleSearch} />
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron ofertas</Text>}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
});

export default Home;
