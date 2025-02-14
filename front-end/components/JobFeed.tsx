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
            <View style={[darkStyles.itemContainer, { width: imageSize, height: imageSize }]}>
                <Image source={{ uri: item.imageUrl }} style={darkStyles.image} />
            </View>
        );
    };

    return (
        <View style={darkStyles.container}>
            <Text style={darkStyles.title}>Trabajos realizados</Text>
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

const darkStyles = StyleSheet.create({
    container: { marginBottom: 20, backgroundColor: '#121212', padding: 10 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginLeft: 5, color: '#E0E0E0' },
    itemContainer: { margin: 5, backgroundColor: '#1E1E1E', borderRadius: 8 },
    image: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 8 },
});

export default JobFeed;
