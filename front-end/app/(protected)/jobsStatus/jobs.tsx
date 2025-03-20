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
import { useRouter } from 'expo-router';
import { GetJobsAssignedNoCompleted, GetJobsAssignedCompleted } from '@/services/JobsService';
import * as Notifications from 'expo-notifications';

const JobsStatusScreen: React.FC = () => {
  const { token } = useAuth();
  const router = useRouter();

  const [jobsNotCompleted, setJobsNotCompleted] = useState<any[]>([]);
  const [jobsCompleted, setJobsCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'assigned' | 'completed'>('assigned');
  const [highlightedJobTitle, setHighlightedJobTitle] = useState<string | null>(null);

  // Suscribirse a notificaciones push y capturar el jobTitle
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data.jobTitle) {
        setHighlightedJobTitle(data.jobTitle as string);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!token) return;
      setLoading(true);
      setError('');

      try {
        const [responseNotCompleted, responseCompleted] = await Promise.all([
          GetJobsAssignedNoCompleted(token),
          GetJobsAssignedCompleted(token),
        ]);
        setJobsNotCompleted(responseNotCompleted?.data || []);
        setJobsCompleted(responseCompleted?.data || []);
      } catch (err: any) {
        setError('Error al obtener los trabajos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [token]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.title === highlightedJobTitle && styles.highlightedCard,
      ]}
      onPress={() => router.push(`/jobsStatus/JobDetailWorker?id=${item.id}`)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.status}>Estado: {item.status}</Text>
    </TouchableOpacity>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'assigned' && styles.activeTab]}
        onPress={() => setSelectedTab('assigned')}
      >
        <Text style={[styles.tabText, selectedTab === 'assigned' && styles.activeTabText]}>
          Asignados
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'completed' && styles.activeTab]}
        onPress={() => setSelectedTab('completed')}
      >
        <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
          Completados
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#03DAC5" />
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

  const jobsToShow = selectedTab === 'assigned' ? jobsNotCompleted : jobsCompleted;

  return (
    <View style={styles.container}>
      {renderTabs()}
      <FlatList
        data={jobsToShow}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {selectedTab === 'assigned'
              ? 'No se encontraron trabajos asignados sin completar'
              : 'No se encontraron trabajos completados'}
          </Text>
        }
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2027', // Fondo principal
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: '#203a43',
    borderWidth: 1,
    borderColor: '#2c5364',
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#03DAC5',
    borderColor: '#03DAC5',
  },
  tabText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#0f2027',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#0f2027',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#CF6679',
    marginBottom: 20,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#B0B0B0',
  },
  card: {
    backgroundColor: '#203a43',
    padding: 16,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2c5364',
    // sombra suave
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  highlightedCard: {
    borderColor: '#F44336', // Borde rojo para destacar
    borderWidth: 2,
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
