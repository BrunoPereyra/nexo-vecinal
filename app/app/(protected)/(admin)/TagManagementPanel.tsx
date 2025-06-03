import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

type TagManagementPanelProps = {
    adminTags: string[];
    newTag: string;
    onChangeNewTag: (text: string) => void;
    onAddTag: () => void;
    onRemoveTag: (tag: string) => void;
    loadingTags: boolean;
};

const TagManagementPanel: React.FC<TagManagementPanelProps> = ({
    adminTags,
    newTag,
    onChangeNewTag,
    onAddTag,
    onRemoveTag,
    loadingTags,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Gestión de Tags</Text>
            {loadingTags ? (
                <ActivityIndicator color="#03DAC5" />
            ) : (
                <View style={styles.tagsList}>
                    {adminTags.map((tag, index) => (
                        <View key={index} style={styles.tagItem}>
                            <Text style={styles.tagText}>{tag}</Text>
                            <TouchableOpacity onPress={() => onRemoveTag(tag)} style={styles.removeButton}>
                                <Text style={styles.removeButtonText}>X</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
            <View style={styles.addContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Nuevo tag"
                    placeholderTextColor="#888"
                    value={newTag}
                    onChangeText={onChangeNewTag}
                    autoFocus={true}
                />
                <TouchableOpacity onPress={onAddTag} style={styles.addButton}>
                    <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#03DAC5',
        marginBottom: 8,
        textAlign: 'center',
    },
    tagsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121212',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#03DAC5',
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 12,
        color: '#E0E0E0',
        marginRight: 4,
    },
    removeButton: {
        backgroundColor: '#BB86FC',
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    removeButtonText: {
        color: '#121212',
        fontSize: 10,
        fontWeight: 'bold',
    },
    addContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#03DAC5',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#121212',
        color: '#E0E0E0',
        marginRight: 8,
    },
    addButton: {
        backgroundColor: '#03DAC5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#121212',
        fontWeight: 'bold',
    },
});

export default TagManagementPanel;
