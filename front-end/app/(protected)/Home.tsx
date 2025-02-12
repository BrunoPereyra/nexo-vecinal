// /app/(protected)/Home.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, StyleSheet, Text } from 'react-native';
import { getJobsByFilters } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';
import JobCard from '@/components/JobCard';
import Navbar from '@/components/Navbar';

interface FilterParams {
  tags: string[];
  longitude: number;
  latitude: number;
  radius: number;
}

const Home: React.FC = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [tags, setTags] = useState('');
  // Valores iniciales para la ubicación (coordenadas de Córdoba Capital)
  const [longitude, setLongitude] = useState<number>(-64.1811);
  const [latitude, setLatitude] = useState<number>(-31.4201);

  const [radius, setRadius] = useState<number>(5000); // Radio en metros

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    if (!token) return;
    const filters: FilterParams = {
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      longitude,
      latitude,
      radius,
    };
    try {
      const data = await getJobsByFilters(filters, token);
      console.log(data);

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Navbar />
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filtrar Ofertas</Text>
        <TextInput
          style={styles.input}
          placeholder="Etiquetas (separadas por coma)"
          value={tags}
          onChangeText={setTags}
        />
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            placeholder="Longitud"
            value={longitude.toString()}
            onChangeText={(text) => setLongitude(parseFloat(text) || -58.3816)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.locationInput]}
            placeholder="Latitud"
            value={latitude.toString()}
            onChangeText={(text) => setLatitude(parseFloat(text) || -34.6037)}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Radio (metros)"
          value={radius.toString()}
          onChangeText={(text) => setRadius(parseFloat(text) || 5000)}
          keyboardType="numeric"
        />
        <Button title="Buscar" onPress={fetchJobs} color="#1e88e5" />
      </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  filterContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 10,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationInput: {
    flex: 0.48,
  },
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
