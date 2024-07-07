import config from "../static/config.json" assert {type: "json"};
import axios from "axios";
import https from 'https';

const {API_BASE_URL, API_TOKEN} = config;
const httpsAgent = new https.Agent({rejectUnauthorized: false}); // Accepte les certificats auto-signés
let tokenData = {token: '', expires: Date.now()}; // Token d'authentification

// Fonction pour exécuter une requête avec rafraîchissement du token
export async function executeRequestWithTokenRefresh(url, options = {method: 'GET', data: null, responseType: 'json'}) {
    const request = async () => axios({
        url,
        method: options.method,
        data: options.data,
        headers: {'Authorization': `${tokenData.token}`},
        responseType: options.responseType,
        httpsAgent
    });

    try {
        return await request();
    } catch (error) {
        if (error.response && error.response.status === 401) {
            await refreshTokenIfNeeded(true);
            return await request();
        } else {
            throw error;
        }
    }
}

// Fonction pour rafraîchir le token si nécessaire
export async function refreshTokenIfNeeded(forceRefresh = false) {
    if (forceRefresh || Date.now() >= tokenData.expires) {
        const response = await axios.post(`${API_BASE_URL}/auth/`, {secret_key: API_TOKEN}, {httpsAgent});
        tokenData = {token: response.data.access_token, expires: Date.now() + (24 * 60 * 60 * 1000)}; // Expiration dans 24 heures
    }
}