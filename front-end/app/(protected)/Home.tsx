// /app/(protected)/Home.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
import { getJobsByFilters } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import JobCard from '@/components/JobCardHome';
import JobSearchFilters from '@/components/JobSearchFilters';

interface FilterParams {
  searchTitle: string;
  selectedTags: string[];
  trianglePoints: { latitude: number; longitude: number }[];
  location: { latitude: number; longitude: number } | null;
  radius: number;
}

// Variable global para almacenar el offset
let savedScrollOffset = 0;

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const flatListRef = useRef<FlatList<any>>(null);

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
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  // Al montar, se intenta restaurar la posición del scroll
  useEffect(() => {
    if (flatListRef.current && savedScrollOffset > 0) {
      flatListRef.current.scrollToOffset({ offset: savedScrollOffset, animated: false });
    }
  }, []);

  return (
    <View style={styles.container}>
      <JobSearchFilters onSearch={handleSearch} />
      <FlatList
        ref={flatListRef}
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron ofertas</Text>}
        // Guardamos el offset en la variable global cada vez que se hace scroll
        onScroll={(event) => {
          savedScrollOffset = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
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
