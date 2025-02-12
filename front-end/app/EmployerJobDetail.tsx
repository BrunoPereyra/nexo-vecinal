import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  GetJobTokenAdmin,
  assignJob,
  reassignJob,
  updateJobStatusToCompleted
} from '@/services/JobsService'; // Ajusta la ruta según tu estructura

export default function EmployerJobDetail() {
  // Se obtiene el parámetro "id" de la URL (por ejemplo, ?id=123)
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {

    const fetchJobDetail = async () => {
      if (!jobId || !token) return;
      setLoading(true);
      try {
        const data = await GetJobTokenAdmin(jobId, token);
        setJobDetail(data);
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
      setJobDetail(res);
      alert('Trabajo marcado como completado');
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
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
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Información principal del trabajo */}
      <Text style={styles.title}>{jobDetail.title}</Text>
      <Text style={styles.description}>{jobDetail.description}</Text>
      <Text style={styles.detail}>Precio: ${jobDetail.price}</Text>
      <Text style={styles.detail}>Ubicación: {jobDetail.location}</Text>
      <Text style={styles.detail}>Estado: {jobDetail.status}</Text>
      {jobDetail.assignedCandidate && (
        <Text style={styles.detail}>
          Asignado a: {jobDetail.assignedCandidate.name}
        </Text>
      )}

      {/* Sección de acciones para el dueño del trabajo */}
      {jobDetail.isOwner ? (
        <View style={styles.ownerSection}>
          <Text style={styles.sectionTitle}>Postulados:</Text>
          {jobDetail.appliedCandidates.length === 0 ? (
            <Text>No hay postulantes</Text>
          ) : (
            <FlatList
              data={jobDetail.appliedCandidates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.candidateCard}>
                  <Text style={styles.candidateName}>{item.name}</Text>
                  {/* Si aún no hay asignado, permite asignar; de lo contrario, permite reasignar */}
                  {!jobDetail.assignedCandidate ? (
                    <Button
                      title="Asignar"
                      onPress={() => handleAssign(item.id)}
                      disabled={actionLoading}
                    />
                  ) : (
                    <Button
                      title="Reasignar"
                      onPress={() => handleReassign(item.id)}
                      disabled={actionLoading}
                    />
                  )}
                </View>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={actionLoading}
          >
            <Text style={styles.completeButtonText}>Marcar como completado</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.infoText}>
          No tienes permisos para modificar este trabajo.
        </Text>
      )}

      <Button title="Volver" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  description: {
    fontSize: 16,
    marginBottom: 8
  },
  detail: {
    fontSize: 16,
    marginBottom: 4
  },
  ownerSection: {
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  candidateCard: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  candidateName: {
    fontSize: 16
  },
  completeButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 16,
    alignItems: 'center'
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  infoText: {
    marginVertical: 16,
    fontSize: 16,
    color: '#555'
  },
  errorText: {
    color: 'red',
    marginBottom: 16
  }
});
