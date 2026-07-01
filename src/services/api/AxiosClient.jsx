import axios from 'axios';
import { getAuth, clearAuth } from '../../utils/Auth';
import { toast } from 'react-toastify';

const AxiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
});

AxiosClient.interceptors.request.use(
    (config) => {
        const auth = getAuth();
        if (auth && auth.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

AxiosClient.interceptors.response.use(
    (response) => {
        // If the response contains pagination metadata, return the full body
        // so the caller can read both .data and .metadata
        if (response.data?.metadata) {
            return response.data;
        }
        return response.data?.data !== undefined ? response.data.data : response.data;
    },
    (error) => {
        const status = error.response ? error.response.status : null;

        if (status === 401) {
            // 401: Unauthorized / Session Expired
            clearAuth();
            
            const privatePaths = ['/profile', '/admin', '/author', '/forum'];
            const currentPath = window.location.pathname;
            const isPrivate = privatePaths.some(path => currentPath.startsWith(path));
            
            if (isPrivate) {
                toast.error("Session expired. Please log in again!");
                window.location.href = '/';
            } else {
                window.location.reload();
            }
        } 
        else if (status === 403) {
            // 403: Forbidden / Access Denied
            toast.error("Access denied! There is an issue with your account permissions.");
        }
        else if (status === 500) {
            // 500: Internal Server Error
            toast.error("System error (Server Error). Please try again later!");
        }

        return Promise.reject(error);
    }
);

export default AxiosClient;
