// courseService.ts

export interface Socials {
    instagram: string;
    youtube: string;
    website: string;
    twitter: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    content: string;
    socials: Socials;
    campaignStart: string; // ISO string
    campaignEnd: string;   // ISO string
    baneado: boolean;
    seccion: string;
}

export interface CreateCourseRequest {
    title: string;
    description: string;
    content: string;
    socials: Socials;
    campaignStart: string; // formato ISO, ej: "2025-02-24T16:48:00Z"
    campaignEnd: string;   // formato ISO
    baneado: boolean;
    seccion: string;
    code: string;
}

import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:90000";


/**
 * Crea un nuevo curso en el servidor.
 * @param data Datos del curso a crear.
 * @param token Token de autorización.
 * @returns El curso creado.
 */
export async function createCourse(
    data: CreateCourseRequest,
    token: string
): Promise<Course> {

    const response = await fetch(`${API_BASE}/cursos/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {

        throw new Error(`Error creating course: ${response.statusText}`);
    }
    const course: Course = await response.json();

    return course;
}

/**
 * Obtiene cursos de forma paginada.
 * @param page Número de página (por defecto 1).
 * @param limit Límite de elementos por página (por defecto 10).
 * @param token (Opcional) Token de autorización.
 * @returns Array de cursos.
 */
export async function getCoursesPaginated(
    page: number = 1,
    limit: number = 10,
    token?: string
): Promise<Course[]> {
    const url = new URL(`${API_BASE}/cursos/paginated`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
        throw new Error(`Error fetching courses: ${response.statusText}`);
    }
    const data = await response.json();
    return data; // Se asume que el endpoint devuelve un array de cursos
}

/**
 * Obtiene cursos activos (aquellos cuya campaña no ha finalizado).
 * @param token (Opcional) Token de autorización.
 * @returns Array de cursos activos.
 */
export async function getActiveCourses(token?: string): Promise<Course[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/cursos/active`, { headers });
    if (!response.ok) {
        throw new Error(`Error fetching active courses: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
}
// GetCursoByID
export async function getCourseById(
    id: string,
): Promise<Course> {
    const response = await fetch(`${API_BASE}/cursos/${id}`);
    if (!response.ok) {
        throw new Error(`Error fetching course: ${response.statusText}`);
    }
    const data = await response.json();

    return data;
}