import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, Modal } from 'react-native';
import { getJobsByFilters } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import JobCard from '@/components/JobCardHome';
import JobSearchFilters, { FilterParams } from '@/components/JobSearchFilters';
import JobDetailView, { Job } from '@/components/JobDetailView';

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
      console.error('Error fetching jobs:', error);
    }
  };

  useEffect(() => {
    if (flatListRef.current && savedScrollOffset > 0) {
      flatListRef.current.scrollToOffset({ offset: savedScrollOffset, animated: false });
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Filtros de búsqueda, colocados en la parte superior y con mayor presencia */}
      <JobSearchFilters onSearch={handleSearch} />
      <FlatList
        ref={flatListRef}
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => setSelectedJob(item)} />
        )}
        contentContainerStyle={styles.listContainer}
      />
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
