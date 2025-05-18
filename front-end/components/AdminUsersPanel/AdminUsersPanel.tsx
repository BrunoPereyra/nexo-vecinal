import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getUsers, blockUser, enableUserForWork, disableUserForWork, unblockUser } from '@/services/admin';
import { useAuth } from '@/context/AuthContext';

type User = {
    id: string;
    Avatar: string;
    NameUser: string;
    biography: string;
    Email: string;
    Gender: string;
    categoryPreferences: Record<string, number> | null;
    tags: string[];
    location: { type: string; coordinates: [number, number] };
    Ratio: number;
    Banned: boolean;
    availableToWork?: boolean;
};

const AdminUsersPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [codeModalVisible, setCodeModalVisible] = useState(false);
    const [currentAction, setCurrentAction] = useState<'enable' | 'disable' | 'block' | 'unblock' | null>(null);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            fetchUsers(token, searchQuery);
        }
    }, [searchQuery, token]);

    const fetchUsers = async (token: string, nameUser: string) => {
        setLoading(true);
        try {
            const response = await getUsers(token, nameUser);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleBlockUser = (userId: string) => {
        setCurrentAction('block');
        setCurrentUserId(userId);
        setCodeModalVisible(true); // Abre el modal para ingresar el código
    };

    const handleUnblockUser = (userId: string) => {
        setCurrentAction('unblock');
        setCurrentUserId(userId);
        setCodeModalVisible(true); // Abre el modal para ingresar el código
    };
    const handleEnableUserForWork = (userId: string) => {
        setCurrentAction('enable');
        setCurrentUserId(userId);
        setCodeModalVisible(true); // Abre el modal para ingresar el código
    };

    const handleDisableUserForWork = (userId: string) => {
        setCurrentAction('disable');
        setCurrentUserId(userId);
        setCodeModalVisible(true); // Abre el modal para ingresar el código
    };

    const submitCode = async () => {
        if (!code) {
            Alert.alert('Error', 'El código no puede estar vacío.');
            return;
        }

        try {
            if (currentAction === 'enable' && currentUserId) {
                await enableUserForWork(currentUserId, token as string, code);
                Alert.alert('Usuario habilitado para trabajar');
            } else if (currentAction === 'disable' && currentUserId) {
                await disableUserForWork(currentUserId, token as string, code);
                Alert.alert('Usuario deshabilitado para trabajar');
            } else if (currentAction === 'block' && currentUserId) {
                await blockUser(currentUserId, code, token as string);
                Alert.alert('Usuario bloqueado');
            } else if (currentAction === 'unblock' && currentUserId) {
                await unblockUser(currentUserId, code, token as string);
                Alert.alert('Usuario desbloqueado');
            }
            fetchUsers(token as string, searchQuery); // Refresca la lista
        } catch {
            Alert.alert('Error', 'No se pudo completar la acción.');
        } finally {
            setCode('');
            setCodeModalVisible(false); // Cierra el modal
        }
    };

    const openModal = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const closeModal = () => {
        setSelectedUser(null);
        setModalVisible(false);
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <Image source={{ uri: item.Avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.NameUser}</Text>
                <Text style={styles.email}>{item.Email}</Text>
                <Text style={styles.biography}>{item.biography || 'Sin descripción'}</Text>
                <Text style={styles.detail}>Género: {item.Gender || 'No especificado'}</Text>
                <Text style={styles.detail}>
                    Preferencias: {item.categoryPreferences ? JSON.stringify(item.categoryPreferences) : 'N/A'}
                </Text>
                <Text style={styles.detail}>Tags: {item.tags?.join(', ') || 'Sin tags'}</Text>
                <Text style={styles.detail}>Ratio: {item.Ratio}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, item.Banned ? styles.disabledButton : styles.dangerButton]}
                    onPress={() => !item.Banned ? handleBlockUser(item.id) : handleUnblockUser(item.id)}
                >
                    <Text style={styles.buttonText}>{item.Banned ? 'Bloqueado' : 'Bloquear'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                        item.availableToWork
                            ? handleDisableUserForWork(item.id)
                            : handleEnableUserForWork(item.id)
                    }
                >
                    <Text style={styles.buttonText}>
                        {item.availableToWork ? 'Deshabilitar' : 'Habilitar'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => openModal(item)}>
                    <Text style={styles.buttonText}>Ver ubicación</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre de usuario"
                placeholderTextColor="#B0B0B0"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {loading ? (
                <ActivityIndicator size="large" color="#03DAC5" />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
            {selectedUser && (
                <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Ubicación del usuario</Text>
                            {selectedUser.location && (
                                <MapView
                                    style={styles.map}
                                    initialRegion={{
                                        latitude: selectedUser.location.coordinates[1],
                                        longitude: selectedUser.location.coordinates[0],
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    }}
                                >
                                    <Marker
                                        coordinate={{
                                            latitude: selectedUser.location.coordinates[1],
                                            longitude: selectedUser.location.coordinates[0],
                                        }}
                                        title={selectedUser.NameUser}
                                    />
                                </MapView>
                            )}
                            <Text style={styles.detail}>
                                Radio: {selectedUser.Ratio || 'No especificado'}
                            </Text>
                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Text style={styles.buttonText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
            <Modal visible={codeModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {currentAction === 'enable' ? 'Habilitar Usuario' : 'Deshabilitar Usuario'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Introduce el código"
                            placeholderTextColor="#B0B0B0"
                            value={code}
                            onChangeText={setCode}
                        />
                        <TouchableOpacity style={styles.submitButton} onPress={submitCode}>
                            <Text style={styles.buttonText}>Aceptar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setCodeModalVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


export default AdminUsersPanel;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 16,
    },
    searchInput: {
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    listContainer: {
        paddingBottom: 16,
    },
    userCard: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
    },
    email: {
        fontSize: 14,
        color: '#B0B0B0',
    },
    biography: {
        fontSize: 12,
        color: '#B0B0B0',
        marginVertical: 4,
    },
    detail: {
        fontSize: 12,
        color: '#B0B0B0',
    },
    actions: {
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#03DAC5',
        padding: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    dangerButton: {
        backgroundColor: '#CF6679',
    },
    disabledButton: {
        backgroundColor: '#555',
    },
    buttonText: {
        color: '#121212',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E0E0E0',
        marginBottom: 10,
    },
    map: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: '#03DAC5',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    input: {
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#03DAC5',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
});