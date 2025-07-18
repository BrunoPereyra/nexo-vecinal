import Constants from "expo-constants";
const API = "http://192.168.0.28:9000"

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


export const SaveUserCodeConfirm = async (
    code: string,
    referral: string,
    Intentions: string
) => {
    console.log(code,
        referral,
        Intentions);
    try {
        const res = await fetch(API + "/user/SaveUserCodeConfirm", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                referral,
                Intentions
            })
        });


        return await res.json();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error');
    }
};


export const loginWithGoogle = async (idToken: string) => {
    try {
        const res = await fetch(`${API}/user/google_callback?code=${encodeURIComponent(idToken)}`, {
            method: "GET", // no pongas body acá
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();

        if (res.ok) {
            return data;
        } else {
            throw new Error(data?.message || "Login con Google falló");
        }
    } catch (error) {
        console.error("Error en login con Google:", error);
        throw error;
    }
};


export const CompleteGoogleProfile = async (payload: {
    email: string;
    nameUser: string;
    password: string;
    FullName: string;
    BirthDates: string;
    Gender: string;
    Intentions: string;
    Referral: string;
    Avatar: string;
}) => {

    const res = await fetch(API + "/user/Google_callback_Complete_Profile_And_Username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Error al completar perfil");
    return await res.json();
};
