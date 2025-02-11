// /components/JobFeed.tsx
import React from 'react';
import { View, Text, Image, FlatList, StyleSheet, Dimensions } from 'react-native';

type JobFeedProps = {
    jobs: any[];
};

export const JobFeed: React.FC<JobFeedProps> = ({ jobs }) => {
    const numColumns = 3;
    const imageSize = Dimensions.get('window').width / numColumns - 10;

    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={[styles.itemContainer, { width: imageSize, height: imageSize }]}>
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trabajos realizados</Text>
            <FlatList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
    itemContainer: { margin: 5, backgroundColor: '#ccc' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
});
