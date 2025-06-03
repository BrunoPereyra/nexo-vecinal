import Constants from "expo-constants";
const API = "https://deploy.pinkker.tv/9000"

/**
 * Procesa la respuesta de la API, verificando el Content-Type.
 */
const processResponse = async (res: Response) => {
    const contentType = res.headers.get('Content-Type') || '';
    return contentType.includes('application/json')
        ? await res.json()
        : await res.text();
};

/**
 * Crea o actualiza un reporte de contenido.
 * @param reportData - Objeto con la información del reporte:
 *   - contentType: "post" | "job"
 *   - description: string
 *   - reportedContentId: string
 * @param token - Token JWT del usuario autenticado
 */
export const createOrUpdateContentReport = async (reportData: any, token: string) => {
    try {
        const res = await fetch(`${API}/reports/reportContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reportData)
        });

        if (!res.ok) {
            console.log(res.json());

        }
        return await processResponse(res);
    } catch (error) {
        console.error("Error en createOrUpdateContentReport:", error);
    }
};

/**
 * Obtiene los reportes de contenido con paginación.
 * @param page - Número de página (inicia en 1)
 * @param limit - Cantidad de elementos por página
 * @param token - Token JWT del usuario autenticado
 */
export const getContentReports = async (page: number, limit: number, token: string) => {
    try {
        const url = `${API}/reports/GetContentReports?page=${page}&limit=${limit}`;

        const res = await fetch(url, {
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
        console.error("Error en getContentReports:", error);
        throw error;
    }
};
