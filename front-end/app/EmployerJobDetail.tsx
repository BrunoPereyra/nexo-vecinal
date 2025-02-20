import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  GetJobTokenAdmin,
  assignJob,
  reassignJob,
  updateJobStatusToCompleted,
  provideEmployerFeedback,
  provideWorkerFeedback
} from '@/services/JobsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApplicantsList from '@/components/ApplicantsList';

export default function EmployerJobDetail() {
  // Obtenemos el parámetro "id" de la URL
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Estados para feedback y rating (para el feedback del empleador)
  const [feedback, setFeedback] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  // Estado para el ID del usuario actual (empleador)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
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

  const handleAssign = async (candidateId: string) => {
    if (!jobDetail || !token) return;
    setActionLoading(true);
    try {
      const res = await assignJob(jobDetail.id, candidateId, token);
      setJobDetail(res);
      alert('Trabajador asignado exitosamente');
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async (candidateId: string) => {
    if (!jobDetail || !token) return;
    setActionLoading(true);
    try {
      const res = await reassignJob(jobDetail.id, candidateId, token);
      setJobDetail(res);
      alert('Reasignación exitosa');
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

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

  // Solo el empleador (currentUserId === jobDetail.userId) puede dejar o actualizar su feedback.
  const handleLeaveFeedback = async () => {
    if (!feedback.trim() || rating === 0 || !jobDetail || !token) {
      alert('El feedback y la calificación no pueden estar vacíos');
      return;
    }
    setActionLoading(true);
    try {
      const feedbackData = { comment: feedback.trim(), rating };
      // Como es el empleador, usamos provideEmployerFeedback
      const res = await provideEmployerFeedback(jobDetail.id, feedbackData, token);
      console.log(res);
      if (res && res.message === "Employer feedback provided successfully") {
        alert('Feedback enviado exitosamente');
        setJobDetail({ ...jobDetail, employerFeedback: res.feedback });
        setFeedback('');
        setRating(0);
      } else {
        alert('No se pudo enviar el feedback');
      }
    } catch (error) {
      console.error('Error al enviar feedback:', error);
      alert('Ocurrió un error al enviar el feedback');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={darkStyles.center}>
        <ActivityIndicator size="large" color="#03DAC5" />
      </View>
    );
  }

  if (error || !jobDetail) {
    return (
      <View style={darkStyles.center}>
        <Text style={darkStyles.errorText}>{error || 'No se encontró el detalle del trabajo'}</Text>
        <Button title="Volver" onPress={() => router.back()} color="#03DAC5" />
      </View>
    );
  }

  // Aseguramos que applicants sea un array y obtenemos el candidato asignado
  const applicants = jobDetail.applicants || [];
  const assignedCandidate = jobDetail.assignedCandidate || null;
  const otherApplicants = assignedCandidate
    ? applicants.filter((applicant: any) => applicant.id !== assignedCandidate.id)
    : applicants;

  return (
    <ScrollView style={darkStyles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Información principal del trabajo */}
      <Text style={darkStyles.title}>{jobDetail.title}</Text>
      <Text style={darkStyles.description}>{jobDetail.description}</Text>
      <Text style={darkStyles.detail}>Precio: ${jobDetail.price || jobDetail.budget}</Text>
      <Text style={darkStyles.detail}>Estado: {jobDetail.status}</Text>
      {assignedCandidate && (
        <Text style={darkStyles.detail}>Asignado a: {assignedCandidate.nameUser}</Text>
      )}

      <TouchableOpacity
        style={darkStyles.chatButton}
        onPress={() => router.push(`/ChatJobs?jobId=${jobDetail.id}`)}
      >
        <Text style={darkStyles.chatButtonText}>Abrir Chat</Text>
      </TouchableOpacity>

      {/* Mapa para mostrar la ubicación */}
      {jobDetail.location && jobDetail.location.coordinates && (
        <View style={darkStyles.mapContainer}>
          <MapView
            style={darkStyles.map}
            initialRegion={{
              latitude: jobDetail.location.coordinates[1],
              longitude: jobDetail.location.coordinates[0],
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: jobDetail.location.coordinates[1],
                longitude: jobDetail.location.coordinates[0],
              }}
              title={jobDetail.title}
              description={jobDetail.description}
            />
          </MapView>
        </View>
      )}

      {/* Sección de postulados */}
      <ApplicantsList job={jobDetail} token={token as string} />

      <TouchableOpacity
        style={darkStyles.completeButton}
        onPress={handleComplete}
        disabled={actionLoading}
      >
        <Text style={darkStyles.completeButtonText}>Marcar como completado</Text>
      </TouchableOpacity>

      {/* Sección de feedback: mostramos ambos feedbacks */}
      <View style={darkStyles.feedbackContainer}>
        {/* Feedback del Empleador */}
        <Text style={darkStyles.sectionTitle}>Feedback del Empleador:</Text>
        {jobDetail.employerFeedback ? (
          <View style={darkStyles.existingFeedbackContainer}>
            <Text style={darkStyles.feedbackText}>
              Comentario: {jobDetail.employerFeedback.comment}
            </Text>
            <Text style={darkStyles.feedbackText}>
              Calificación: {jobDetail.employerFeedback.rating} {jobDetail.employerFeedback.rating === 1 ? "estrella" : "estrellas"}
            </Text>
            <Text style={darkStyles.feedbackText}>
              Fecha: {new Date(jobDetail.employerFeedback.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={darkStyles.feedbackText}>Aún no se ha dejado feedback del empleador.</Text>
        )}

        {/* Feedback del Trabajador */}
        <Text style={darkStyles.sectionTitle}>Feedback del Trabajador:</Text>
        {jobDetail.workerFeedback ? (
          <View style={darkStyles.existingFeedbackContainer}>
            <Text style={darkStyles.feedbackText}>
              Comentario: {jobDetail.workerFeedback.comment}
            </Text>
            <Text style={darkStyles.feedbackText}>
              Calificación: {jobDetail.workerFeedback.rating} {jobDetail.workerFeedback.rating === 1 ? "estrella" : "estrellas"}
            </Text>
            <Text style={darkStyles.feedbackText}>
              Fecha: {new Date(jobDetail.workerFeedback.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={darkStyles.feedbackText}>Aún no se ha dejado feedback del trabajador.</Text>
        )}

        {/* Formulario para que el empleador deje o actualice su feedback */}
        {currentUserId === jobDetail.userId && (
          <>
            <Text style={darkStyles.sectionTitle}>
              {jobDetail.employerFeedback ? "Actualizar tu Feedback:" : "Dejar tu Feedback:"}
            </Text>
            <View style={darkStyles.ratingContainer}>
              <Text style={darkStyles.ratingLabel}>Calificación:</Text>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={[darkStyles.star, star <= rating ? darkStyles.selectedStar : darkStyles.unselectedStar]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={darkStyles.feedbackInput}
              placeholder="Escribe tu feedback..."
              placeholderTextColor="#888"
              value={feedback}
              onChangeText={setFeedback}
              multiline
            />
            <TouchableOpacity
              style={darkStyles.feedbackButton}
              onPress={handleLeaveFeedback}
              disabled={actionLoading}
            >
              <Text style={darkStyles.feedbackButtonText}>
                {jobDetail.employerFeedback ? "Actualizar Feedback" : "Enviar Feedback"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Button title="Volver" onPress={() => router.back()} color="#03DAC5" />
    </ScrollView>
  );
}

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#121212'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#E0E0E0'
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
    color: '#E0E0E0'
  },
  detail: {
    fontSize: 16,
    marginBottom: 4,
    color: '#E0E0E0'
  },
  mapContainer: {
    height: 200,
    width: '100%',
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  map: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#03DAC5'
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  ratingLabel: {
    fontSize: 16,
    marginRight: 8,
    color: '#E0E0E0'
  },
  star: {
    fontSize: 24,
    marginHorizontal: 2
  },
  selectedStar: {
    color: '#03DAC5'
  },
  unselectedStar: {
    color: '#444'
  },
  feedbackContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 8
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 5,
    padding: 8,
    minHeight: 60,
    marginBottom: 10,
    backgroundColor: '#121212',
    color: '#E0E0E0'
  },
  feedbackButton: {
    backgroundColor: '#03DAC5',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  feedbackButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16
  },
  existingFeedbackContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#121212',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#03DAC5'
  },
  feedbackText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#E0E0E0'
  },
  completeButton: {
    backgroundColor: '#03DAC5',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 16,
    alignItems: 'center'
  },
  completeButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16
  },
  errorText: {
    color: '#CF6679',
    marginBottom: 16
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212'
  },
  chatButton: {
    backgroundColor: '#03DAC5',
    paddingVertical: 10,
    borderRadius: 5,
    marginVertical: 16,
    alignItems: 'center'
  },
  chatButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16
  },
  reportButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#03DAC5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    zIndex: 10
  },
  reportButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14
  }
});
