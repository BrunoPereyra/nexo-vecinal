import Constants from "expo-constants";
const API = "https://deploy.pinkker.tv/9000"


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
        const res = await fetch(`${API}/reports/reports`, {
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
export const enableUserForWork = async (user: any, token: string, code: string) => {
    try {
        const res = await fetch(`${API}/admin/enableUserForWork`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user, code })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en enableUserForWork:", error);
        throw error;
    }
};
export const disableUserForWork = async (user: any, token: string, code: string) => {
    try {
        const res = await fetch(`${API}/admin/disableUserForWork`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user, code })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en enableUserForWork:", error);
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
export const blockUser = async (userId: string, code: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, code })
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
export const unblockUser = async (userId: string, code: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/unblock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, code }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error('Error en unblockUser:', error);
        throw error;
    }
};
/**
 * Obtiene todos los tags existentes.
 * Endpoint: GET /admin/tags
 */
export const getTags = async (token: string) => {
    try {
        const res = await fetch(`${API}/admin/tags`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }
        return await processResponse(res);
    } catch (error) {
        console.error("Error en getTags:", error);
        throw error;
    }
};

/**
 * Agrega un nuevo tag.
 * Endpoint: POST /admin/tags
 * @param tag - El tag a agregar.
 */
export const addTag = async (tag: string, token: string) => {

    try {
        const res = await fetch(`${API}/admin/tags`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tag }),
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en addTag:", error);
        throw error;
    }
};

/**
 * Elimina un tag.
 * Endpoint: DELETE /admin/tags/:tag
 * @param tag - El tag a eliminar.
 */
export const removeTag = async (tag: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/tags/${encodeURIComponent(tag)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }
        return await processResponse(res);
    } catch (error) {
        console.error("Error en removeTag:", error);
        throw error;
    }
};/**
* Realiza una petición para deletear job
* @param jobId - ID del Job
* @param token - Token del usuario para autorización.
* @returns La respuesta de la API en formato JSON.
*/
export const DeleteJob = async (jobId: string, code: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/deleteJob`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ JobId: jobId, AdminCode: code }), // Se envía también el código
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en DeleteJob:", error);
        throw error;
    }
};
/*
* Realiza una petición para deletear job
* @param PostId - ID del Job
* @param token - Token del usuario para autorización.
* @returns La respuesta de la API en formato JSON.
*/
export const DeletePost = async (PostId: string, code: string, token: string) => {
    try {
        const res = await fetch(`${API}/admin/deletePost`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ PostId: PostId, AdminCode: code }), // Se envía también el código
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en DeleteJob:", error);
        throw error;
    }
};

export const deleteContentReport = async (IdReport: string, code: string, token: string) => {
    try {
        console.log("IdReport", IdReport);

        const res = await fetch(`${API}/admin/deleteContentReport`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ IdReport, AdminCode: code }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }

        return await processResponse(res);
    } catch (error) {
        console.error("Error en DeleteJob:", error);
        throw error;
    }
};
// crea a  getUsers por nameUser
export const getUsers = async (token: string, nameUser: string) => {
    try {
        const res = await fetch(`${API}/admin/GetUsers?nameUser=${nameUser}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP: ${res.status} - ${errorText}`);
        }
        return await processResponse(res);
    } catch (error) {
        console.error("Error en getUsers:", error);
        throw error;
    }
}



// Extender ContentReport con los campos necesarios para manejar los botones
export type ContentReport = {
    id: string;
    text: string;
    reportedContentId: string;
    contentType: 'post' | 'job';
    reports: { description: string }[];
    createdAt: string;
    read: boolean;
};