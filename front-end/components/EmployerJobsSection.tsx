// /components/EmployerJobsSection.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

type EmployerJobsSectionProps = {
    jobs: any[];
    onLoadMore: () => void;
};

export const EmployerJobsSection: React.FC<EmployerJobsSectionProps> = ({ jobs, onLoadMore }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mis trabajos publicados</Text>
            <FlatList
                data={jobs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.jobItem}>
                        <Text style={styles.jobTitle}>{item.title}</Text>
                        {/* Puedes agregar más detalles o imágenes según necesites */}
                    </View>
                )}
                // Se dispara onLoadMore cuando el usuario llega al final
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    jobItem: {
        backgroundColor: '#eee',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    jobTitle: { fontSize: 16 },
});
