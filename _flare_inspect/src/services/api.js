import { Capacitor } from '@capacitor/core';

const API_BASE = (Capacitor.isNativePlatform() || window.location.hostname.includes('onrender.com'))
    ? 'https://flare-social.onrender.com/api'
    : '/api';

const getHeaders = () => {
    const token = localStorage.getItem('flare_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    async post(endpoint, data, isMultipart = false) {
        const token = localStorage.getItem('flare_token');
        const headers = isMultipart ? {} : getHeaders();
        if (isMultipart && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: isMultipart ? data : JSON.stringify(data)
        });

        const text = await response.text();
        let resData;
        try {
            resData = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('API Response Parse Error:', e, 'Raw text:', text);
            let summary = text ? text.substring(0, 100).replace(/\n/g, ' ') : 'empty body';
            throw new Error(`Invalid server response (not JSON). Status: ${response.status}. Preview: ${summary}`);
        }

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('flare_token');
                localStorage.removeItem('flare_user');
            }
            throw new Error(resData.error || `API Error: ${response.status}`);
        }
        return resData;
    },

    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: getHeaders()
        });
        const text = await response.text();
        let resData;
        try {
            resData = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('API GET Parse Error:', e, 'Raw text:', text);
            let summary = text ? text.substring(0, 100).replace(/\n/g, ' ') : 'empty body';
            throw new Error(`Invalid GET response. Status: ${response.status}. Preview: ${summary}`);
        }
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('flare_token');
                localStorage.removeItem('flare_user');
            }
            throw new Error(resData.error || `API Error: ${response.status}`);
        }
        return resData;
    },

    async put(endpoint, data, isMultipart = false) {
        const token = localStorage.getItem('flare_token');
        const headers = isMultipart ? {} : getHeaders();
        if (isMultipart && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers,
            body: isMultipart ? data : JSON.stringify(data)
        });
        const text = await response.text();
        let resData;
        try {
            resData = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('API PUT Parse Error:', e, 'Raw text:', text);
            let summary = text ? text.substring(0, 100).replace(/\n/g, ' ') : 'empty body';
            throw new Error(`Invalid PUT response. Status: ${response.status}. Preview: ${summary}`);
        }
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('flare_token');
                localStorage.removeItem('flare_user');
            }
            throw new Error(resData.error || `API Error: ${response.status}`);
        }
        return resData;
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const text = await response.text();
        let resData;
        try {
            resData = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('API DELETE Parse Error:', e, 'Raw text:', text);
            let summary = text ? text.substring(0, 100).replace(/\n/g, ' ') : 'empty body';
            throw new Error(`Invalid DELETE response. Status: ${response.status}. Preview: ${summary}`);
        }
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('flare_token');
                localStorage.removeItem('flare_user');
            }
            throw new Error(resData.error || `API Error: ${response.status}`);
        }
        return resData;
    },

    setToken(token) {
        localStorage.setItem('flare_token', token);
    },

    clearToken() {
        localStorage.removeItem('flare_token');
        localStorage.removeItem('flare_user');
    },

    getToken() {
        return localStorage.getItem('flare_token');
    }
};
