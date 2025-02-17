import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GetJobsAssignedNoCompleted } from '@/services/JobsService';

const JobsStatusScreen: React.FC = () => {
  const { token } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchJobs = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Se asume que el servicio retorna un objeto con la propiedad "data" que es un arreglo de jobs
        const data = await GetJobsAssignedNoCompleted(token);
        console.log(data);
        setJobs(data?.data || []);
      } catch (err: any) {
        setError('Error al obtener los trabajos asignados sin completar');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [token]);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push(`/JobDetail?id=${item.id}`);
        }}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.status}>Estado: {item.status}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No se encontraron trabajos asignados sin completar
          </Text>
        }
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#CF6679', marginBottom: 20 },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    marginVertical: 6,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  status: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 4,
  },
});

export default JobsStatusScreen;
