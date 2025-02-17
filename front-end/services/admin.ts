const API = process.env.EXPO_URL_API ?? "http://192.168.0.11:8084"

/**
 * Realiza una petición POST para crear un nuevo reporte.
 * @param reportData - Objeto con la información del reporte a crear. Debe incluir:
 *                     - reportedUserId: string (ID del usuario reportado)
 *                     - text: string (motivo o comentario del reporte)
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const createReports = async (reportData: any, token: string) => {
    try {
        const res = await fetch(`${API}/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reportData)
        });



        // Verificamos el Content-Type de la respuesta
        const contentType = res.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            return await res.json();
        } else {
            return await res.text();
        }
    } catch (error) {
        console.error("Error en createReports:", error);
    }
};

