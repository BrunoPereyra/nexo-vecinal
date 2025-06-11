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
import { GetJobsAssignedNoCompleted, GetJobsAssignedCompleted, GetJobRequestsReceived } from '@/services/JobsService';
import * as Notifications from 'expo-notifications';
import colors from '@/style/colors';

const JobsStatusScreen: React.FC = () => {
  const { token } = useAuth();
  const router = useRouter();

  const [jobsNotCompleted, setJobsNotCompleted] = useState<any[]>([]);
  const [jobsCompleted, setJobsCompleted] = useState<any[]>([]);
  const [jobRequests, setJobRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'assigned' | 'completed' | 'requests'>('assigned');
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

        const [responseNotCompleted, responseCompleted, responseRequests] = await Promise.all([
          GetJobsAssignedNoCompleted(token),
          GetJobsAssignedCompleted(token),
          GetJobRequestsReceived(token),
        ]);
        setJobsNotCompleted(responseNotCompleted?.data || []);
        setJobsCompleted(responseCompleted?.data || []);

        console.log("BB", responseRequests);

        setJobRequests(responseRequests?.jobs || []);
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
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'requests' && styles.activeTab]}
        onPress={() => setSelectedTab('requests')}
      >
        <Text style={[styles.tabText, selectedTab === 'requests' && styles.activeTabText]}>
          Solicitudes
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

  const jobsToShow =
    selectedTab === 'assigned'
      ? jobsNotCompleted
      : selectedTab === 'completed'
        ? jobsCompleted
        : jobRequests;

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
              : selectedTab === 'completed'
                ? 'No se encontraron trabajos completados'
                : 'No se encontraron solicitudes de trabajo'}
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
    backgroundColor: colors.background, // "#FFFFFF"
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
    backgroundColor: colors.cream, // "#FFF8DC"
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: colors.gold, // "#FFD700"
    borderColor: colors.gold,
  },
  tabText: {
    fontSize: 16,
    color: colors.textDark, // "#333"
  },
  activeTabText: {
    fontWeight: 'bold',
    color: colors.textDark, // "#333"
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.warmWhite, // "#FAF9F6"
  },
  center: {
    flex: 1,
    backgroundColor: colors.background, // "#FFFFFF"
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.errorRed, // "#CF6679"
    marginBottom: 20,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: colors.textMuted, // "#888"
  },
  card: {
    backgroundColor: colors.cream, // "#FFF8DC"
    padding: 16,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  highlightedCard: {
    borderColor: "#F44336", // Borde rojo para destacar
    borderWidth: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark, // "#333"
  },
  status: {
    fontSize: 14,
    color: colors.textMuted, // "#888"
    marginTop: 4,
  },
});
export default JobsStatusScreen;
