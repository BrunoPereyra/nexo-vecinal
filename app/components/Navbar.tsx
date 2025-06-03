// /components/Navbar.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Modal,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface NavItem {
    id: string;
    label: string;
    route: string;
}

const navItems: NavItem[] = [
    { id: 'profile', label: 'Perfil', route: 'profile' },
    { id: 'login', label: 'Login', route: 'login' },
];

const Navbar: React.FC = () => {
    const navigation = useNavigation();
    const { logout } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);

    const handleAvatarPress = () => {
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const handleNavItemPress = (route: string) => {
        setModalVisible(false);
        navigation.navigate(route as never);
    };

    const handleLogout = async () => {
        setModalVisible(false);
        await logout();
        navigation.navigate('login' as never);
    };

    return (
        <View style={styles.navbarContainer}>
            <TouchableOpacity onPress={handleAvatarPress}>
                <Image
                    source={{ uri: 'https://via.placeholder.com/40' }} // Avatar por defecto
                    style={styles.avatar}
                />
            </TouchableOpacity>
            <Text style={styles.title}>Ofertas de Trabajo</Text>
            <Ionicons name="menu" size={24} color="#fff" onPress={handleAvatarPress} />

            {/* Modal Sidebar */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={handleCloseModal}
                    activeOpacity={1}
                >
                    <View style={styles.sidebarContainer}>
                        <FlatList
                            data={navItems}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.navItem}
                                    onPress={() => handleNavItemPress(item.route)}
                                >
                                    <Text style={styles.navItemText}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    navbarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e88e5',
        paddingVertical: 12,
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    title: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
    },
    sidebarContainer: {
        width: 250,
        backgroundColor: '#fff',
        padding: 20,
        justifyContent: 'space-between',
        elevation: 5,
    },
    navItem: {
        paddingVertical: 12,
    },
    navItemText: {
        fontSize: 18,
        color: '#333',
    },
    logoutButton: {
        backgroundColor: '#e53935',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 20,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default Navbar;
