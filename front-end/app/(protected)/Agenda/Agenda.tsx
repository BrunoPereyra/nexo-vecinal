import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    Image,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getChatRooms } from "@/services/chatService";
import colors from "@/style/colors";

export default function Agenda() {
    const router = useRouter();
    const { token } = useAuth();

    // Estados
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);      // Cargando la primera página
    const [loadingMore, setLoadingMore] = useState(false); // Cargando páginas siguientes
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true); // Para saber si quedan más chats por cargar

    // Efecto para cargar la primera página al montar
    useEffect(() => {

        fetchChats(1);
    }, [token]);
    function formatLastActivity(dateString = "") {
        const date = new Date(dateString);
        const now = new Date();

        // Si por algún motivo la fecha es inválida, retornamos algo genérico.
        if (isNaN(date.getTime())) {
            return "Fecha inválida";
        }

        // Resta en milisegundos, usando getTime()
        const diffMs = now.getTime() - date.getTime();

        if (diffMs < 0) {
            // La fecha está en el futuro (raro, pero por si acaso)
            return "En el futuro";
        }

        // Convertimos milisegundos a días
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 1) {
            // Menos de 24 horas
            return "Hoy";
        } else if (diffDays < 2) {
            // Entre 24 y 48 horas
            return "Ayer";
        } else if (diffDays < 7) {
            // Menos de 7 días
            return `Hace ${Math.floor(diffDays)} día(s)`;
        } else {
            // Más de 7 días: formateamos la fecha
            const day = date.getDate();
            const month = date.getMonth() + 1; // 0 = enero
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, "0");

            // Formato: DD/MM/YYYY HH:MM (ajusta como prefieras)
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    }


    // Función para obtener chats
    const fetchChats = async (pageNumber: number) => {

        if (!token) {
            setError("No hay token disponible.");
            setLoading(false);
            return;
        }

        try {
            const data = await getChatRooms(token, pageNumber);

            if (pageNumber === 1) {
                setChats(data || []);
            } else {
                // Páginas siguientes: concatenar
                if (!data) {
                    setChats([]);
                } else {
                    // data es ChatRoom[]
                    setChats(data);
                }
            }

            // Si la respuesta trae menos de 10, asumimos que no hay más
            if (!data || data.length < 10) {
                setHasMore(false);
            }
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los chats");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Cargar más cuando el usuario hace scroll cerca del final
    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        setPage(nextPage);
        fetchChats(nextPage);
    };

    // Abrir un chat en la ruta deseada
    const openChat = (chat: any) => {
        router.push(
            `/(protected)/(chat)/ChatScreen?employerProfile=${encodeURIComponent(
                JSON.stringify(chat.otherUser)
            )}&origin=agenda`
        );
    };

    // Renderizar cada chat en la lista
    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatContainer}
            onPress={() => openChat(item)}
        >
            <Image
                source={{
                    uri:
                        item?.otherUser?.avatar ||
                        "https://example.com/default-avatar.png",
                }}
                style={styles.avatar}
            />
            <View style={styles.infoContainer}>
                <Text style={styles.name}>
                    {item?.otherUser?.nameUser || "Usuario desconocido"}
                </Text>
                <Text style={styles.subText}>
                    Última actividad: {formatLastActivity(item.updatedAt)}
                </Text>

            </View>
        </TouchableOpacity>
    );

    // Render para footer de la lista (indicador de carga)
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#2c5364" />
        );
    };

    if (loading && page === 1) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2c5364" />
                <Text style={styles.loadingText}>Cargando chats...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tus Chats</Text>
            <FlatList
                data={chats}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <Text style={styles.subText}>No tienes chats activos.</Text>
                }
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // "#FFFFFF"
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background, // "#FFFFFF"
    },
    loadingText: {
        color: colors.textDark, // "#333"
        fontSize: 16,
        marginTop: 8,
    },
    errorText: {
        color: colors.errorRed, // "#D32F2F" (Rojo)
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        color: colors.textDark, // "#333"
        marginBottom: 12,
    },
    chatContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        padding: 10,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    infoContainer: {
        marginLeft: 12,
    },
    name: {
        color: colors.textDark, // "#333"
        fontSize: 16,
        marginBottom: 4,
    },
    subText: {
        color: colors.textMuted, // "#888"
        fontSize: 14,
    },
});
