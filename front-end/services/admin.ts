const API = process.env.EXPO_URL_API ?? "http://192.168.0.28:8084";

/**
 * Procesa la respuesta de la API, verificando el Content-Type.
 * @param res - Objeto Response obtenido de fetch.
 * @returns La respuesta en formato JSON o texto, según corresponda.
 */
const processResponse = async (res: Response) => {
    const contentType = res.headers.get('Content-Type') || '';
    return contentType.includes('application/json')
        ? await res.json()
        : await res.text();
};

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

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en createReports:", error);
        throw error;
    }
};

/**
 * Realiza una petición GET para obtener un reporte por ID.
 * @param reportId - ID del reporte a obtener.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getReportById = async (reportId: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/reports/${reportId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en getReportById:", error);
        throw error;
    }
};

/**
 * Realiza una petición GET para obtener reportes filtrados por parámetros de consulta.
 * @param queryParams - Objeto con los parámetros de consulta (por ejemplo: { reporterUserId: string }).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getReportsByUser = async (queryParams: Record<string, string>, token: string) => {
    try {
        const queryString = new URLSearchParams(queryParams).toString();
        const res = await fetch(`${API}/admin/reports?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en getReportsByUser:", error);
        throw error;
    }
};

/**
 * Realiza una petición GET para obtener reportes globales.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getGlobalReports = async (token: string) => {
    try {
        console.log(`${API}/admin/reports/global`)
        const res = await fetch(`${API}/admin/reports/global`, {
            method: 'GET',
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en getGlobalReports:", error);
        throw error;
    }
};

/**
 * Realiza una petición POST para marcar un reporte como leído.
 * @param reportId - ID del reporte a marcar como leído.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const markReportAsRead = async (reportId: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/reports/${reportId}/read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en markReportAsRead:", error);
        throw error;
    }
};

/**
 * Realiza una petición POST para bloquear un usuario.
 * @param userId - ID del usuario a bloquear.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const blockUser = async (userId: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en blockUser:", error);
        throw error;
    }
};
