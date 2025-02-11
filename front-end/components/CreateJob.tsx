import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import MapView, {
  Marker,
  MapPressEvent,
  MarkerDragStartEndEvent,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { createJob } from '@/services/JobsService';
import { useAuth } from '@/context/AuthContext';

type CreateJobProps = {
  visible: boolean;
  onClose: () => void;
  onJobCreated?: (job: any) => void;
};

export const CreateJob: React.FC<CreateJobProps> = ({
  visible,
  onClose,
  onJobCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Utilizamos location como objeto de coordenadas
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [tags, setTags] = useState('');
  const [budget, setBudget] = useState('');

  const { token } = useAuth();

  // Función para manejar el toque en el mapa
  const handleMapPress = (e: MapPressEvent) => {
    const { coordinate } = e.nativeEvent;
    console.log("Map pressed at:", coordinate);
    setLocation(coordinate);
  };

  // Función para manejar el final del arrastre del marcador
  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    const { coordinate } = e.nativeEvent;
    console.log("Marker dragged to:", coordinate);
    setLocation(coordinate);
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !tags.trim() ||
      !budget.trim() ||
      !location
    ) {
      Alert.alert(
        'Error',
        'Todos los campos son obligatorios y debes seleccionar una ubicación.'
      );
      return;
    }

    const budgetNumber = parseFloat(budget);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      Alert.alert('Error', 'El presupuesto debe ser un número mayor que 0.');
      return;
    }

    if (title.length < 3 || title.length > 100) {
      Alert.alert('Error', 'El título debe tener entre 3 y 100 caracteres.');
      return;
    }
    if (description.length < 10 || description.length > 1000) {
      Alert.alert(
        'Error',
        'La descripción debe tener entre 10 y 1000 caracteres.'
      );
      return;
    }

    const tagsArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    if (tagsArray.length === 0) {
      Alert.alert('Error', 'Debe ingresar al menos una etiqueta.');
      return;
    }

    if (budgetNumber <= 2000) {
      Alert.alert('Error', 'El presupuesto debe ser mayor a 2000.');
      return;
    }

    // Convertir la ubicación en una cadena o mantenerla como objeto según lo que requiera tu API
    const locationString = `${location.latitude},${location.longitude}`;

    const jobData = {
      title,
      description,
      location: locationString,
      tags: tagsArray,
      budget: budgetNumber,
    };

    try {
      const response = await createJob(jobData, token as string);
      if (response && response.success) {
        Alert.alert('Éxito', 'Trabajo creado exitosamente.');
        if (onJobCreated) {
          onJobCreated(response.job);
        }
        // Limpiar formulario y cerrar modal
        setTitle('');
        setDescription('');
        setLocation(null);
        setTags('');
        setBudget('');
        onClose();
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear el trabajo.');
      }
    } catch (error) {
      console.error('Error al crear el trabajo:', error);
      Alert.alert('Error', 'Ocurrió un error al crear el trabajo.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Crear nuevo trabajo</Text>
          <TextInput
            placeholder="Título"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Descripción"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multilineInput]}
            multiline
          />

          {/* Sección para seleccionar la ubicación en el mapa */}
          <Text style={styles.label}>Selecciona ubicación en el mapa</Text>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE} // Usa Google Maps si lo deseas (opcional)
            initialRegion={{
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
          >
            {location && (
              <Marker
                coordinate={location}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            )}
          </MapView>

          <TextInput
            placeholder="Etiquetas (separadas por coma)"
            value={tags}
            onChangeText={setTags}
            style={styles.input}
          />
          <TextInput
            placeholder="Presupuesto"
            value={budget}
            onChangeText={setBudget}
            style={styles.input}
            keyboardType="numeric"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 5,
  },
  cancelButton: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
