import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import MapView, {
  Marker,
  MapPressEvent,
  MarkerDragStartEndEvent,
} from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { createJob, solicitarTrabajoAUnTrabajador } from "@/services/JobsService";
import { useAuth } from "@/context/AuthContext";
import ErrorBoundary from "../ErrorBoundary";
import colors from "@/style/colors";
import CustomAlert from "@/components/CustomAlert";

type CreateJobProps = {
  visible: boolean;
  onClose: () => void;
  onJobCreated?: (job: any) => void;
  preselectedUser?: any; // <-- NUEVO

};

export const CreateJob: React.FC<CreateJobProps> = ({
  visible,
  onClose,
  onJobCreated,
  preselectedUser
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Se requieren permisos para acceder a la galería");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // Ocultar el alert automáticamente después de unos segundos
  useEffect(() => {
    if (alertVisible) {
      const timeout = setTimeout(() => setAlertVisible(false), 2500);
      return () => clearTimeout(timeout);
    }
  }, [alertVisible]);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      selectedTags.length === 0 ||
      !budget.trim() ||
      !location
    ) {
      showAlert(
        "Todos los campos son obligatorios y debes seleccionar una ubicación y al menos una etiqueta.",
        "error"
      );
      return;
    }
    setLoading(true)
    const budgetNumber = parseFloat(budget);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      showAlert("El presupuesto debe ser un número mayor que 0.", "error");
      setLoading(false);
      return;
    }
    if (title.length < 3 || title.length > 100) {
      showAlert("El título debe tener entre 3 y 100 caracteres.", "error");
      setLoading(false);
      return;
    }
    if (description.length < 10 || description.length > 1000) {
      showAlert("La descripción debe tener entre 10 y 1000 caracteres.", "error");
      setLoading(false);
      return;
    }
    if (budgetNumber <= 2000) {
      showAlert("El presupuesto debe ser mayor a 2000.", "error");
      setLoading(false);
      return;
    }

    const jobData: any = {
      title,
      description,
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      tags: selectedTags,
      budget: budgetNumber,
      jobType: preselectedUser ? "solicitud" : "publicacion", // <-- SIEMPRE ENVIAR ESTO
    };

    if (preselectedUser) {
      jobData.workerId = preselectedUser.id; // O el campo que corresponda en tu backend
    }

    // Si se seleccionó una imagen, la convertimos a un objeto con las propiedades necesarias
    if (image) {
      const extension = image.split('.').pop() || "jpg";
      jobData.image = {
        uri: image,
        name: `image.${extension}`,
        type: "image/jpeg",
      };
    }

    try {
      let response;
      if (preselectedUser) {
        response = await solicitarTrabajoAUnTrabajador(jobData, token as string);
      } else {
        response = await createJob(jobData, token as string);
      }

      if (response && response.message === "Job created successfully") {
        showAlert("Trabajo creado exitosamente.", "success");
        if (onJobCreated) {
          onJobCreated(response.job);
        }
        // Opcional: reiniciar estados y cerrar modal
        setTitle("");
        setDescription("");
        setLocation(null);
        setSelectedTags([]);
        setBudget("");
        setImage(null);
        onClose();
      } else {
        showAlert(response?.message || "No se pudo crear el trabajo.", "error");
      }
    } catch (error) {
      console.error("Error al crear el trabajo:", error);
      showAlert("Ocurrió un error al crear el trabajo.", "error");
    } finally {
      setLoading(false)
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <Text style={styles.modalTitle}>
                {preselectedUser ? `Solicitar trabajo a ${preselectedUser.NameUser || preselectedUser.FullName}` : "Crear nuevo trabajo"}
              </Text>
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
                  onMapReady={() => setIsMapReady(true)}
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
              {/* <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.buttonText}>Seleccionar imagen</Text>
              </TouchableOpacity> */}
              {image && (
                <Image source={{ uri: image }} style={styles.previewImage} />
              )}
              <View style={styles.buttonContainer}>

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.textDark} />
                  ) : (
                    <Text style={styles.buttonText}>Crear</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          {/* CustomAlert al final del modal */}
          <CustomAlert visible={alertVisible} message={alertMessage} type={alertType} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(23, 23, 22, 0.43)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.warmWhite, // "#FAF9F6"
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
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
    borderColor: colors.borderLight,
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.background,
    color: colors.textDark,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    color: colors.textDark,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: colors.gold,
  },
  tagText: {
    fontSize: 12,
    color: colors.textDark,
  },
  tagTextSelected: {
    color: colors.textDark,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    backgroundColor: colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 5,
  },
  cancelButton: {
    backgroundColor: colors.cream,
  },
  buttonText: {
    color: colors.textDark,
    fontWeight: "bold",
  },
  imageButton: {
    backgroundColor: colors.cream,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
});

export default CreateJob;
