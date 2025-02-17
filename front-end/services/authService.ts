const API = process.env.EXPO_URL_API ?? "http://192.168.0.11:8084"


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
export const SignupService = async (email: string, password: string, nameUser: string) => {
    try {
        const res = await fetch(API + "/user/signupNotConfirmed", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, nameUser, fullName: "bruno pereyra" })
        });

        if (!res.ok) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json(); // Convertimos la respuesta a JSON
        console.log(data); // Mostramos la respuesta en consola
        return data; // Devolvemos la respuesta

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error');
    }
};

export const SaveUserCodeConfirm = async (code: string) => {
    try {
        const res = await fetch(API + "/user/SaveUserCodeConfirm", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        return await res.json();

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error');
    }
};
