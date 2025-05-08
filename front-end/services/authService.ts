import Constants from "expo-constants";
const API = Constants.expoConfig?.extra?.EXPO_URL_API ?? "http://192.168.0.28:90000";



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
