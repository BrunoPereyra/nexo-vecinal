import Constants from "expo-constants";
// const API = "https://deploy.pinkker.tv/9000"
const API = "http://192.168.0.28:9000"
export interface Job {
    id: string;
    title: string;
    description: string;
    tags: string[];
    budget: number;
    userDetails: JobUserDetails;
    status: string;
    Images: string[];
    createdAt: string;
}
export interface JobUserDetails {
    avatar: string;
    id: string;
    nameUser: string;
}

/**
 * Realiza una petición POST para crear un nuevo trabajo.
 * @param jobData - Objeto con la información del job a crear.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const createJob = async (jobData: any, token: string) => {
    try {
        const formData = new FormData();

        formData.append("title", jobData.title);
        formData.append("description", jobData.description);
        formData.append("budget", jobData.budget.toString());
        formData.append("locationStr", JSON.stringify(jobData.location));
        formData.append("jobType", jobData.jobType); // El tipo de trabajo
        jobData.tags.forEach((tag: string) => {
            formData.append("tags", tag);
        });
        if (jobData.image && jobData.image.uri) {
            const imageFile = {
                uri: jobData.image.uri,
                name: `image.${jobData.image.uri.split('.').pop() || "jpg"}`,
                type: "image/jpeg",
            };
            formData.append("image", imageFile as any);
        }

        const res = await fetch(`${API}/job/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        return await res.json();
    } catch (error) {
        console.error("Error en createJob:", error);
    }
};
/**
 * Realiza una petición POST para solicitar un trabajo a un trabajador específico.
 * @param jobData - Objeto con la información del job a crear.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const solicitarTrabajoAUnTrabajador = async (jobData: any, token: string) => {
    try {
        const formData = new FormData();

        formData.append("title", jobData.title);
        formData.append("description", jobData.description);
        formData.append("budget", jobData.budget.toString());
        formData.append("locationStr", JSON.stringify(jobData.location));
        formData.append("workerId", jobData.workerId); // El ID del trabajador solicitado
        formData.append("jobType", jobData.jobType); // El tipo de trabajo

        jobData.tags.forEach((tag: string) => {
            formData.append("tags", tag);
        });
        if (jobData.image && jobData.image.uri) {
            const imageFile = {
                uri: jobData.image.uri,
                name: `image.${jobData.image.uri.split('.').pop() || "jpg"}`,
                type: "image/jpeg",
            };
            formData.append("image", imageFile as any);
        }

        const res = await fetch(`${API}/job/create`, { // Cambia la ruta por la de tu backend
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        return await res.json();
    } catch (error) {
        console.error("Error en solicitarTrabajoAUnTrabajador:", error);
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
            body: JSON.stringify({ JobId })
        });

        return await res.json();
    } catch (error) {
        console.error("Error en createJob:", error);
    }
};
/**
 * Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación.
 * @param userId - ID del usuario.
 * @param page - Número de página (1 en adelante).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const getCreateJobsProfile = async (page: number, token: string) => {

    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-profile?page=${page}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Asegúrate de que no haya espacios extras
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 2:", error);
    }
};

/**
 * Realiza una petición GET para obtener los trabajos Creador por el usuario con paginación.
 * @param page - Número de página (1 en adelante).
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const GetJobsByUserIDForEmploye = async (page: number, token: string) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-user-Employe-profile?page=${page}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Asegúrate de que no haya espacios extras
            }
        });

        return await res.json();
    } catch (error) {
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
        console.error("Error al obtener el jobIdEmployee:", error);
    }
};


/**
 * Realiza una petición POST para que un usuario se postule a un trabajo.
 * @param jobId - ID del trabajo.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const applyToJob = async (
    JobId: string,
    proposal: string,
    price: number,
    token: string
) => {
    try {
        const res = await fetch(`${API}/job/apply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ JobId, Proposal: proposal, price }),
        });
        return await res.json();
    } catch (error) {

        console.error("Error en applyToJob:", error);
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
    }
};

/**
 * Realiza una petición POST para obtener trabajos filtrados por etiquetas y ubicación.
 * @param filters - Objeto que contiene tags, longitude, latitude y radius.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON con la lista de jobs filtrados.
 */
export const getJobsByFilters = async (
    filters: {
        tags: string[];
        longitude: number;
        latitude: number;
        radius: number;
        title: string;
    },
    token: string,
    page: number = 1
) => {
    try {

        const res = await fetch(`${API}/job/get-jobsBy-filters?page=${page}`, {
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
        throw error;
    }
};


/**
 * Realiza una petición POST para actualizar el estado del job a "completed".
 * @param jobId - ID del trabajo.
 * @param token - Token del usuario para autorización.
 * @returns La respuesta de la API en formato JSON.
 */
export const updateJobStatusToCompleted = async (JobId: string, token: string) => {
    try {
        const res = await fetch(`${API}/job/update-job-statusTo-completed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ JobId })

            // Asumimos que el endpoint utiliza el jobId desde la URL; si es necesario, se puede enviar más información en el body.
        });
        return await res.json();
    } catch (error) {
        console.error("Error en updateJobStatusToCompleted:", error);
    }
};
/*
* Realiza una petición GET para obtener los trabajos del perfil del usuario con paginación.
* @param userId - ID del usuario.
* @param page - Número de página (1 en adelante).
* @param token - Token del usuario para autorización.
* @returns La respuesta de la API en formato JSON.
*/
export const getJobsProfileVist = async (page: number, id: string) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-profile-vist?page=${page}&id=${id}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 1:", error);
    }
};
// obtiene los trabajos creados del perfil visitado
export const GetJobsUserIDForEmployeProfilevist = async (page: number, id: string) => {

    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-user-Employe-profile-vist?page=${page}&id=${id}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await res.json();
    } catch (error) {

        console.error("Error en getJobsProfile 3:", error);
    }
};
// como empleado recibio estrellas
export const GetLatestJobsForWorker = async (token: string) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-latest-jobs-worker`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Asegúrate de que no haya espacios extras
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 2:", error);
    }

};
// estrellas que recibio como el empleador
export const GetLatestJobsForEmployer = async (token: string) => {

    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-latest-jobs-employe`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Asegúrate de que no haya espacios extras
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 2:", error);
    }
};
export const GetLatestJobsForWorkervist = async (id: string) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-latest-jobs-worker-vist?id=${id}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 2:", error);
    }
};
export const GetLatestJobsForEmployervist = async (id: string) => {

    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-latest-jobs-employe-vist?id=${id}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error en getJobsProfile 2:", error);
    }
};



export const GetJobsAssignedNoCompleted = async (token: string, page: number = 1) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-assigned-nocompleted?page=${page}`;
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
        console.error("Error en GetJobsAssignedNoCompleted:", error);
    }
};

export const GetJobsAssignedCompleted = async (token: string, page: number = 1) => {
    try {
        // Construimos la URL usando el parámetro page
        const url = `${API}/job/get-jobs-assigned-completed?page=${page}`;
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
        console.error("Error en GetJobsAssignedCompleted:", error);
    }
};
export const GetJobsUserCompleted = async (id: string, page: number = 1) => {
    try {
        const url = `${API}/job/get-jobs-user-completedvisited?id=${id}&page=${page}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error('Error en GetJobsUserCompleted:', error);
    }
};
export const GetJobDetailvisited = async (id: string) => {
    try {
        const url = `${API}/job/get-job-detaild-user-visited?id=${id}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error('Error en GetJobDetailvisited:', error);
    }
};
export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};
export const recommendedJobs = async (token: string, page: string) => {

    try {
        const res = await fetch(`${API}/job/get-recommended-jobs?page=${page}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        // Se asume que la respuesta es JSON
        return await res.json();
    } catch (error) {
        console.error(error);
    }
};
export const GetJobRequestsReceived = async (token: string, page: number = 1) => {
    try {
        const url = `${API}/job/get-job-requests-received?page=${page}`;
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
        console.error("Error en GetJobRequestsReceived:", error);
    }
};