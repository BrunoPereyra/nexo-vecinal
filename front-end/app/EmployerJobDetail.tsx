import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  FlatList,
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
} from '@/services/JobsService'; // Ajusta la ruta según tu estructura
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApplicantsList from '@/components/ApplicantsList';

export default function EmployerJobDetail() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Estados para feedback y rating
  const [feedback, setFeedback] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  // Estado para el ID del usuario actual
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Recuperamos el id del usuario actual
    AsyncStorage.getItem('id').then((id) => {
      setCurrentUserId(id);
    });
  }, []);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!jobId || !token) return;
      setLoading(true);
      try {
        const data = await GetJobTokenAdmin(jobId, token);

        if (data.job) {
          console.log(data.job);

          setJobDetail(data.job);
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
      console.log(jobDetail);

      const res = await updateJobStatusToCompleted(jobDetail.id, token);
      console.log(res);
      if (res.job) {
        if (res.job === "job already completed") {
          alert('El trabajo ya estaba marcado como completado');
        } else {
          // setJobDetail(res);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para enviar o actualizar feedback
  const handleLeaveFeedback = async () => {
    if (!feedback.trim() || rating === 0 || !jobDetail || !token) {
      alert('El feedback y la calificación no pueden estar vacíos');
      return;
    }
    setActionLoading(true);
    try {
      let res = null;
      // Crear el objeto de feedback a enviar
      const feedbackData = { comment: feedback.trim(), rating };

      if (currentUserId === jobDetail.userId) {
        // Si el usuario es el empleador, deja feedback sobre el trabajador.
        res = await provideEmployerFeedback(jobDetail.id, feedbackData, token);
      } else {
        // Si es trabajador, deja feedback sobre el empleador.
        res = await provideWorkerFeedback(jobDetail.id, feedbackData, token);
      }
      if (res && res.success) {
        alert('Feedback enviado exitosamente');
        // Actualizamos el jobDetail para reflejar el feedback recibido.
        // Se asume que el backend devuelve la propiedad feedback en el objeto.
        if (currentUserId === jobDetail.userId) {
          setJobDetail({ ...jobDetail, employerFeedback: res.feedback });
        } else {
          setJobDetail({ ...jobDetail, workerFeedback: res.feedback });
        }
        setFeedbackSent(true);
        setFeedback('');
        setRating(0);
      } else {
        alert('No se pudo enviar el feedback');
      }
    } catch (error) {
      console.error('Error en enviar feedback:', error);
      alert('Ocurrió un error al enviar el feedback');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={darkStyles.center}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={darkStyles.center}>
        <Text style={darkStyles.errorText}>{error}</Text>
        <Button title="Volver" onPress={() => router.back()} color="#bb86fc" />
      </View>
    );
  }

  // Aseguramos que applicants sea un array
  const applicants = jobDetail.applicants || [];
  const assignedCandidate = jobDetail.assignedCandidate || null;
  const otherApplicants = assignedCandidate
    ? applicants.filter((applicant: any) => applicant.id !== assignedCandidate.id)
    : applicants;

  // Determinamos qué feedback mostrar y de quién es
  let existingFeedback = null;
  let feedbackType = "";
  if (currentUserId && jobDetail) {
    if (currentUserId === jobDetail.userId) {
      // El usuario es el empleador
      existingFeedback = jobDetail.employerFeedback;
      feedbackType = "Feedback del Empleador";
    } else {
      // El usuario es el trabajador
      existingFeedback = jobDetail.workerFeedback;
      feedbackType = "Feedback del Trabajador";
    }
  }

  return (
    <View style={darkStyles.container}>
      {/* Información principal del trabajo */}
      <Text style={darkStyles.title}>{jobDetail.title}</Text>
      <Text style={darkStyles.description}>{jobDetail.description}</Text>
      <Text style={darkStyles.detail}>Precio: ${jobDetail.price}</Text>
      <Text style={darkStyles.detail}>Estado: {jobDetail.status}</Text>
      {assignedCandidate && (
        <Text style={darkStyles.detail}>
          Asignado a: {assignedCandidate.nameUser}
        </Text>
      )}

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
      <>
        <ApplicantsList job={jobDetail} token={token as string} />


        <TouchableOpacity
          style={darkStyles.completeButton}
          onPress={handleComplete}
          disabled={actionLoading}
        >
          <Text style={darkStyles.completeButtonText}>Marcar como completado</Text>
        </TouchableOpacity>
        {/* Sección de feedback */}
        <View style={darkStyles.feedbackContainer}>
          <Text style={darkStyles.sectionTitle}>
            {existingFeedback ? `${feedbackType} Recibido:` : "Dejar Opinión:"}
          </Text>
          {existingFeedback && (
            <View style={darkStyles.existingFeedbackContainer}>
              <Text style={darkStyles.feedbackText}>
                Comentario: {existingFeedback.comment}
              </Text>
              <Text style={darkStyles.feedbackText}>
                Calificación: {existingFeedback.rating} {existingFeedback.rating === 1 ? "estrella" : "estrellas"}
              </Text>
              <Text style={darkStyles.feedbackText}>
                Fecha: {new Date(existingFeedback.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
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
              {existingFeedback ? "Actualizar Feedback" : "Enviar Feedback"}
            </Text>
          </TouchableOpacity>
        </View>
      </>

      <Button title="Volver" onPress={() => router.back()} color="#bb86fc" />
    </View>
  );
}

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#121212'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#BB86FC'
  },
  candidateCard: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E'
  },
  candidateName: {
    fontSize: 16,
    color: '#E0E0E0'
  },
  assignedCandidateCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#BB86FC',
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#1E1E1E'
  },
  completeButton: {
    backgroundColor: '#BB86FC',
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
    color: '#F1C40F'
  },
  unselectedStar: {
    color: '#444'
  },
  existingFeedbackContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#121212',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BB86FC'
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#BB86FC'
  },
  feedbackText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#E0E0E0'
  },
  errorText: {
    color: '#CF6679',
    marginBottom: 16
  }
});
