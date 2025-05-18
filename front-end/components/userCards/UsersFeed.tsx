import React, { useState, useRef, useEffect } from "react";
import {
    View, Animated, FlatList, StyleSheet, Modal, Text, ActivityIndicator,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import UserSearchFilters, { UserFilterParams } from "@/components/userCards/UserSearchFilters";
import { searchUsersByNameTagOrLocation } from "@/services/userService";
import UserCard from "@/components/userCards/UserCard"; // Debes crear este componente
import colors from "@/style/colors";
import UserDetailView from "./UserDetailView";
import VisitedProfileModal from "../modalProfilevisited/VisitedProfileModa";

const HEADER_HEIGHT = 50;

const UsersFeed: React.FC = () => {
    const { token, tags: availableTags } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [filterParams, setFilterParams] = useState<UserFilterParams>({
        nameUser: "",
        selectedTags: [],
        location: null,
        radius: 5000,
    });
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const flatListRef = useRef<FlatList<any>>(null);

    // ...existing code...

    const fetchUsers = async (
        pageNumber: number,
        append: boolean = false,
        filtersOverride?: UserFilterParams
    ) => {
        if (!token) return;
        const params = filtersOverride || filterParams;
        const apiFilters = {
            nameUser: params.nameUser,
            tags: params.selectedTags,
            location: params.location
                ? { type: "Point", coordinates: [params.location.longitude, params.location.latitude] }
                : undefined,
            radiusInMeters: params.radius,
            page: pageNumber,
        };
        try {
            const data = await searchUsersByNameTagOrLocation(apiFilters, token);
            console.log(data);

            const usersData = data.users || [];
            if (usersData.length < 1) setHasMore(false);
            if (append) {
                setUsers((prev) => {
                    const all = [...prev, ...usersData];
                    const unique = Array.from(new Map(all.map(u => [(u._id || u.id), u])).values());
                    return unique;
                });
            } else {
                setUsers(usersData);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleSearch = async (filters: UserFilterParams) => {
        setFilterParams(filters);
        setPage(1);
        setHasMore(true);
        await fetchUsers(1, false, filters); // <-- pasa los filtros nuevos aquí
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    };

    // ...existing code...

    useEffect(() => {
        fetchUsers(1, false);
    }, [token]);

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        await fetchUsers(nextPage, true);
        setPage(nextPage);
        setLoadingMore(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.headerContainer}>
                <UserSearchFilters onSearch={handleSearch} availableTags={availableTags || []} />
            </View>
            <FlatList
                ref={flatListRef}
                data={users}
                keyExtractor={(item) => item?._id?.toString() || item?.id?.toString()}
                renderItem={({ item }) => (
                    <UserCard user={item} onPress={() => setSelectedUser(item)} />
                )}
                contentContainerStyle={styles.listContainer}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={{ color: colors.textDark, marginTop: 4, fontSize: 12 }}>Cargando más usuarios...</Text>
                        </View>
                    ) : null
                }
            />
            <VisitedProfileModal
                visible={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                userId={selectedUser?._id || selectedUser?.id}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: colors.warmWhite,
        zIndex: 10,
    },
    listContainer: {
        padding: 13,
        paddingBottom: 16,
        width: "100%",
    },
    footer: {
        paddingVertical: 70,
        alignItems: "center",
    },
});

export default UsersFeed;