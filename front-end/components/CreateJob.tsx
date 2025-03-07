import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
  // La ubicación se guarda como un objeto con propiedades "latitude" y "longitude"
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tags, setTags] = useState('');
  const [budget, setBudget] = useState('');

  const { token } = useAuth();

  // Al tocar el mapa se guarda la coordenada
  const handleMapPress = (e: MapPressEvent) => {
    const { coordinate } = e.nativeEvent;
    setLocation(coordinate);
  };

  // Permite mover el marcador manualmente
  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    const { coordinate } = e.nativeEvent;
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

    // Se crea el objeto jobData, enviando la ubicación en formato GeoJSON:
    const jobData = {
      title,
      description,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      tags: tagsArray,
      budget: budgetNumber,
    };
    try {
      const response = await createJob(jobData, token as string);
      if (response && response.message === "Job created successfully") {
        Alert.alert('Éxito', 'Trabajo creado exitosamente.');
        if (onJobCreated) {
          onJobCreated(response.job);
        }
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
            placeholderTextColor="#888"
          />
          <TextInput
            placeholder="Descripción"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholderTextColor="#888"
          />

          {/* Sección para seleccionar la ubicación en el mapa */}
          <Text style={styles.label}>Selecciona ubicación en el mapa</Text>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: -31.4201,
              longitude: -64.1811,
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
            placeholderTextColor="#888"
          />
          <TextInput
            placeholder="Presupuesto"
            value={budget}
            onChangeText={setBudget}
            style={styles.input}
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
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
    backgroundColor: 'rgba(0,0,0,0.7)', // Overlay semitransparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E', // Fondo oscuro para el modal
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#03DAC5',
  },
  input: {
    borderWidth: 1,
    borderColor: '#03DAC5', // Borde con color de acento
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#121212',
    color: '#E0E0E0',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#E0E0E0',
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
    backgroundColor: '#03DAC5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 5,
  },
  cancelButton: {
    backgroundColor: '#BB86FC',
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
});

export default CreateJob;
