import Constants from "expo-constants";
const API = "https://deploy.pinkker.tv/9000"

export const loginNameUser = async (NameUser: string, password: string) => {

    try {
        const res = await fetch(API + "/user/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NameUser, password })
        });

        const data = await res.json();
        if (data.token) {
            return data;
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Procesa la respuesta de la API, verificando el Content-Type.
 * @param res - Objeto Response obtenido de fetch.
 * @returns La respuesta en formato JSON o texto.
 */
const processResponse = async (res: Response) => {
    const contentType = res.headers.get("Content-Type") || "";
    return contentType.includes("application/json")
        ? await res.json()
        : await res.text();
};

/**
 * Realiza una petición POST para signup.
 * Se envían: email, password, nameUser, fullName, BirthDate y Gender.
 */
export const SignupService = async (
    email: string,
    password: string,
    nameUser: string,
    fullName: string,
    birthDate: string,
    Gender: string
) => {
    try {
        const res = await fetch(API + "/user/signupNotConfirmed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, nameUser, fullName, BirthDate: birthDate, Gender }),
        });
        if (!res.ok) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        return await processResponse(res);
    } catch (error) {
        return error

    }
};


export const SaveUserCodeConfirm = async (code: string, referral: string, Intentions: string) => {
    try {
        const res = await fetch(API + "/user/SaveUserCodeConfirm", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, referral, Intentions })
        });
        return await res.json();

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error');
    }
};

// google auth

export const loginWithGoogle = async (googleAccessToken: string) => {
    console.log("Intentando iniciar sesión con Google...");
    console.log("Token de acceso de Google:", googleAccessToken);

    try {
        const response = await fetch('TU_URL_DEL_BACKEND/api/auth/google', { // <-- ¡IMPORTANTE! Reemplaza con la URL de tu endpoint de backend
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ googleAccessToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Maneja errores específicos de tu backend aquí
            throw new Error(data.message || 'Error en el backend al iniciar sesión con Google');
        }

        // Tu backend debería devolver algo como: { token: '...', _id: '...', avatar: '...', nameUser: '...' }
        return data;
    } catch (error) {
        console.error("Error al comunicar con el backend para Google Login:", error);
        throw error;
    }
};