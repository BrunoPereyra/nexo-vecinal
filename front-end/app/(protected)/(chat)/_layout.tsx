// app/(protected)/(chat)/_layout.tsx
import { Slot } from "expo-router";

// En expo-router v4, ya no hay `unstable_settings` como en v1/v2.
// Pero un layout con <Slot /> basta para "encapsular" las rutas internas
// sin generar una ruta tab adicional.
export default function ChatLayout() {
    return <Slot />;
}
