import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  GetJobTokenAdmin,
  updateJobStatusToCompleted,
  provideEmployerFeedback
} from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApplicantsList from '@/components/ApplicantsList';
import { FeedbackSection } from '@/components/FeedbackSection';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/style/colors';

export default function EmployerJobDetail() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Estados para feedback y rating (empleador)
  const [feedback, setFeedback] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  // Estado para el ID del usuario actual (empleador)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      router.push(
        `/profile/Profile`
      )
    }
    AsyncStorage.getItem('id').then((id) => setCurrentUserId(id));
  }, []);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!jobId || !token) return;
      setLoading(true);
      try {
        const data = await GetJobTokenAdmin(jobId, token);
        if (data.job) {
          setJobDetail(data.job);
        } else {
          setError('No se encontró el detalle del trabajo');
        }
      } catch (err) {
        setError('Error al obtener el detalle del trabajo');
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetail();
  }, [jobId, token]);

  const handleComplete = async () => {
    if (!jobDetail || !token) return;
    setActionLoading(true);
    try {
      const res = await updateJobStatusToCompleted(jobDetail.id, token);
      if (res.job) {
        if (res.job === "job already completed") {
          alert('El trabajo ya estaba marcado como completado');
        } else {
          alert('Trabajo completado');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para que el empleador deje o actualice su feedback
  const handleLeaveFeedback = async () => {
    if (!feedback.trim() || rating === 0 || !jobDetail || !token) {
      alert('El feedback y la calificación no pueden estar vacíos');
      return;
    }
    setActionLoading(true);
    try {
      const feedbackData = { comment: feedback.trim(), rating };
      const res = await provideEmployerFeedback(jobDetail.id, feedbackData, token);
      if (res && res.message === "Employer feedback provided successfully") {
        alert('Feedback enviado exitosamente');
        setJobDetail({ ...jobDetail, employerFeedback: res.feedback });
        setFeedback('');
        setRating(0);
      } else {
        alert('No se pudo enviar el feedback');
      }
    } catch (error) {
      alert('Ocurrió un error al enviar el feedback');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#03DAC5" />
      </View>
    );
  }

  if (error || !jobDetail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || 'No se encontró el detalle del trabajo'}
        </Text>
      </View>
    );
  }

  const assignedCandidate = jobDetail.assignedCandidate || null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Card de Detalle del Trabajo */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{jobDetail.title}</Text>
          <Text style={styles.jobDescription}>{jobDetail.description}</Text>
          {
            console.log(jobDetail.Images)

          }
          {Array.isArray(jobDetail.Images) && jobDetail.Images?.[0] && (
            <View style={styles.imageContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {jobDetail.Images.map((imageUrl: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Precio:</Text>
            <Text style={styles.detailValue}>
              ${jobDetail.price || jobDetail.budget}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado:</Text>
            <Text style={styles.detailValue}>{jobDetail.status}</Text>
          </View>
          {assignedCandidate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Asignado a:</Text>
              <Text style={styles.detailValue}>{assignedCandidate.nameUser}</Text>
            </View>
          )}
        </View>

        {/* Mapa */}
        {jobDetail.location && jobDetail.location.coordinates && (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: jobDetail.location.coordinates[1],
                longitude: jobDetail.location.coordinates[0],
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  longitude: jobDetail.location.coordinates[0],
                  latitude: jobDetail.location.coordinates[1],
                }}
                title={jobDetail.title}
                description={jobDetail.description}
              />
            </MapView>
          </View>
        )}

        <ApplicantsList job={jobDetail} token={token as string} />

        {/* Botón para marcar como completado con confirmación */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() =>
            Alert.alert(
              "Confirmar acción",
              "¿Estás seguro de marcar este trabajo como completado?",
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Sí, completar", onPress: handleComplete }
              ]
            )
          }
          disabled={actionLoading}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.completeButtonText}>Marcar como completado</Text>
        </TouchableOpacity>


        <FeedbackSection
          jobDetail={jobDetail}
          currentUserId={currentUserId || ''}
          rating={rating}
          feedback={feedback}
          actionLoading={actionLoading}
          setRating={setRating}
          setFeedback={setFeedback}
          handleLeaveFeedback={handleLeaveFeedback}
          mode="employer"
        />
      </ScrollView>

      {/* Botón flotante para abrir el chat */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push(
            `/(protected)/(chat)/ChatScreen?jobId=${jobDetail.id}&employerProfile=${encodeURIComponent(
              JSON.stringify(jobDetail.assignedTo.userData)
            )}&origin=EmployerJobDetail`
          )
        }
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="#121212" />
      </TouchableOpacity>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // "#FFFFFF"
  },
  contentContainer: {
    padding: 6,
    paddingBottom: 30,
    backgroundColor: colors.warmWhite, // "#FAF9F6"
  },
  center: {
    flex: 1,
    backgroundColor: colors.background, // "#FFFFFF"
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: colors.errorRed, // "#CF6679"
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: colors.cream, // "#FFF8DC"
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textDark, // "#333"
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 16,
    color: colors.textMuted, // "#888"
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark, // "#333"
    marginRight: 8,
  },
  detailValue: {
    fontSize: 16,
    color: colors.textDark, // "#333"
  },
  mapCard: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    backgroundColor: colors.cream, // "#FFF8DC"
  },
  map: {
    flex: 1,
  },
  completeButton: {
    backgroundColor: colors.gold, // "#FFD700"
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    margin: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  completeButtonText: {
    color: colors.textDark, // "#333"
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 10,
    backgroundColor: colors.gold, // "#FFD700"
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
  },
  postImage: {
    width: screenWidth * 0.9,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: "cover",
  },
});
