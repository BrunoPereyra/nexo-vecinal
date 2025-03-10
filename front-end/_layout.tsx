import { Stack } from "expo-router";

export default function RootLayout() {
    return (
        <Stack
            screenOptions={{
                contentStyle: {
                    backgroundColor: "#121212", // Color de fondo para TODAS las pantallas
                },
            }}
        />
    );
}
