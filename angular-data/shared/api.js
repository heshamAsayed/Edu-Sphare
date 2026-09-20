/**
 * Alpha Gen Academy - Common API Client & Auth Helpers
 */
const API_CONFIG = {
    // If frontend is served separately (e.g. localhost:4200 or 5500), points to .NET backend
    BASE_URL: window.location.origin.includes(':7196') || window.location.origin.includes(':5000')
        ? ''
        : 'https://localhost:7196',
    TOKEN_KEY: 'AlphaGen_Token'
};

function getAuthToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY) || '';
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
    } else {
        localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    }
}

async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Include credentials so HttpOnly cookies are passed too
    const fetchOptions = {
        ...options,
        headers,
        credentials: 'include'
    };

    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
        console.warn('Unauthorized request to', endpoint);
    }

    return response;
}
