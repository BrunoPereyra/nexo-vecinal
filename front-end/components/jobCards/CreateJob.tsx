import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import MapView, {
  Marker,
  MapPressEvent,
  MarkerDragStartEndEvent,
} from "react-native-maps";
import { createJob } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import ErrorBoundary from "../ErrorBoundary";
import colors from "@/style/colors";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const { token, tags: availableTags } = useAuth();

  const handleMapPress = (e: MapPressEvent) => {
    const { coordinate } = e.nativeEvent;
    setLocation(coordinate);
  };

  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    const { coordinate } = e.nativeEvent;
    setLocation(coordinate);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      selectedTags.length === 0 ||
      !budget.trim() ||
      !location
    ) {
      Alert.alert(
        "Error",
        "Todos los campos son obligatorios y debes seleccionar una ubicación y al menos una etiqueta."
      );
      return;
    }

    const budgetNumber = parseFloat(budget);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      Alert.alert("Error", "El presupuesto debe ser un número mayor que 0.");
      return;
    }

    if (title.length < 3 || title.length > 100) {
      Alert.alert("Error", "El título debe tener entre 3 y 100 caracteres.");
      return;
    }
    if (description.length < 10 || description.length > 1000) {
      Alert.alert("Error", "La descripción debe tener entre 10 y 1000 caracteres.");
      return;
    }
    if (budgetNumber <= 2000) {
      Alert.alert("Error", "El presupuesto debe ser mayor a 2000.");
      return;
    }

    const jobData = {
      title,
      description,
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      tags: selectedTags,
      budget: budgetNumber,
    };

    try {
      const response = await createJob(jobData, token as string);
      if (response && response.message === "Job created successfully") {
        Alert.alert("Éxito", "Trabajo creado exitosamente.");
        if (onJobCreated) {
          onJobCreated(response.job);
        }
        setTitle("");
        setDescription("");
        setLocation(null);
        setSelectedTags([]);
        setBudget("");
        onClose();
      } else {
        Alert.alert("Error", response.message || "No se pudo crear el trabajo.");
      }
    } catch (error) {
      console.error("Error al crear el trabajo:", error);
      Alert.alert("Error", "Ocurrió un error al crear el trabajo.");
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
          <Text style={styles.label}>Selecciona ubicación en el mapa</Text>
          <ErrorBoundary>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location ? location.latitude : -31.4201,
                longitude: location ? location.longitude : -64.1811,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={handleMapPress}
              onMapReady={() => {
                setIsMapReady(true);
              }}
            >
              {location && isMapReady && (
                <Marker
                  coordinate={location}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              )}
            </MapView>
          </ErrorBoundary>
          <Text style={styles.label}>Selecciona etiquetas:</Text>
          <View style={styles.tagsContainer}>
            {availableTags && availableTags.length > 0 ? (
              availableTags.map((tag: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tag,
                    selectedTags.includes(tag) && styles.tagSelected,
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.tagTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.label}>No hay etiquetas disponibles</Text>
            )}
          </View>
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
    backgroundColor: "rgba(255,255,224,0.7)", // Overlay amarillo claro
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.warmWhite, // "#FAF9F6"
    padding: 20,
    borderRadius: 10,
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: colors.gold, // "#FFD700"
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.background, // "#FFFFFF"
    color: colors.textDark, // "#333"
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    color: colors.textDark, // "#333"
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tag: {
    backgroundColor: colors.background, // "#FFFFFF"
    borderWidth: 1,
    borderColor: colors.borderLight, // "#EAE6DA"
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: colors.gold, // "#FFD700"
  },
  tagText: {
    fontSize: 12,
    color: colors.textDark, // "#333"
  },
  tagTextSelected: {
    color: colors.textDark, // "#333"
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    backgroundColor: colors.gold, // "#FFD700"
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 5,
  },
  cancelButton: {
    backgroundColor: colors.cream, // "#FFF8DC"
  },
  buttonText: {
    color: colors.textDark, // "#333"
    fontWeight: "bold",
  },
});

export default CreateJob;
