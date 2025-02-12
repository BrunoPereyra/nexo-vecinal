import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

const JobDetail = () => {
    const { id } = useLocalSearchParams();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Detalles del Trabajo</Text>
            <Text style={styles.info}>ID del Trabajo: {id}</Text>
            {/* Aquí puedes hacer una consulta a tu API con el ID */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    info: {
        fontSize: 16,
        color: '#333',
    },
});

export default JobDetail;
