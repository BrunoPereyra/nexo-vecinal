import { router } from "expo-router";

const API = process.env.EXPO_URL_API ?? "http://192.168.0.22:8084"

/**
 * Realiza una petición POST para crear un nuevo trabajo.
 * @param jobData - Objeto con la información del job a crear.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const createJob = async (jobData: any, token: string) => {
    try {
        const res = await fetch(`${API}/job/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobData)
        });
        return await res.json();
    } catch (error) {
        console.error("Error en createJob:", error);
        alert('Ocurrió un error al crear el job');
    }
};
export const GetJobTokenAdmin = async (JobId: any, token: string) => {
    try {
        const res = await fetch(`${API}/job/get-job-token-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JobId
        });
        return await res.json();
    } catch (error) {
        console.error("Error en createJob:", error);
        alert('Ocurrió un error al crear el job');
    }
};
export const jobIdEmployee = async (jobId: string, token: string) => {
    try {
        const url = `${API}/job/get-jobIdEmploye?jobId=${encodeURIComponent(jobId)}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error al obtener el job:", error);
        alert('Ocurrió un error al obtener el job');
    }
};


/**
 * Realiza una petición POST para que un usuario se postule a un trabajo.
 * @param jobId - ID del trabajo.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const applyToJob = async (jobId: string, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
            // No se requiere body, ya que el token y el jobId en la URL son suficientes.
        });
        return await res.json();
    } catch (error) {
        console.error("Error en applyToJob:", error);
        alert('Ocurrió un error al aplicar al job');
    }
};

/**
 * Realiza una petición PUT para asignar a un trabajador a un job.
 * @param jobId - ID del trabajo.
 * @param workerId - ID del trabajador a asignar.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const assignJob = async (jobId: string, workerId: string, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ workerId })
        });
        return await res.json();
    } catch (error) {
        console.error("Error en assignJob:", error);
        alert('Ocurrió un error al asignar el job');
    }
};

/**
 * Realiza una petición PUT para reasignar un job a un nuevo trabajador.
 * @param jobId - ID del trabajo.
 * @param newWorkerId - ID del nuevo trabajador a asignar.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const reassignJob = async (jobId: string, newWorkerId: string, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/reassign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newWorkerId })
        });
        return await res.json();
    } catch (error) {
        console.error("Error en reassignJob:", error);
        alert('Ocurrió un error al reasignar el job');
    }
};

/**
 * Realiza una petición POST para que el empleador deje feedback sobre el trabajador.
 * @param jobId - ID del trabajo.
 * @param feedback - Objeto con el feedback (comentario, rating, etc.).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const provideEmployerFeedback = async (jobId: string, feedback: any, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/employer-feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(feedback)
        });
        return await res.json();
    } catch (error) {
        console.error("Error en provideEmployerFeedback:", error);
        alert('Ocurrió un error al enviar el feedback del empleador');
    }
};

/**
 * Realiza una petición POST para que el trabajador deje feedback sobre el empleador.
 * @param jobId - ID del trabajo.
 * @param feedback - Objeto con el feedback (comentario, rating, etc.).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const provideWorkerFeedback = async (jobId: string, feedback: any, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/worker-feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(feedback)
        });
        return await res.json();
    } catch (error) {
        console.error("Error en provideWorkerFeedback:", error);
        alert('Ocurrió un error al enviar el feedback del trabajador');
    }
};

/**
 * Realiza una petición POST para obtener trabajos filtrados por etiquetas y ubicación.
 * @param filters - Objeto que contiene tags, longitude, latitude y radius.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON con la lista de jobs filtrados.
 */
export const getJobsByFilters = async (filters: {
    tags: string[];
    longitude: number;
    latitude: number;
    radius: number;
}, token: string) => {
    try {
        const res = await fetch(`${API}/job/get-jobsBy-filters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(filters)
        });
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsByFilters:", error);
        alert('Ocurrió un error al obtener los trabajos');
    }
};

/**
 * Realiza una petición POST para actualizar el estado del job a "completed".
 * @param jobId - ID del trabajo.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const updateJobStatusToCompleted = async (jobId: string, token: string) => {
    try {
        const res = await fetch(`${API}/job/${jobId}/update-job-statusTo-completed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
            // Asumimos que el endpoint utiliza el jobId desde la URL; si es necesario, se puede enviar más información en el body.
        });
        return await res.json();
    } catch (error) {
        console.error("Error en updateJobStatusToCompleted:", error);
        alert('Ocurrió un error al actualizar el estado del job');
    }
};
