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
        const requestUrl = error.config?.url || '';
        const isLoginRequest = requestUrl.includes('/auth/login');

        // Suppress error notifications if user is logging out (in-flight requests fail after credentials cleared)
        const auth = getAuth();
        const hasAuthHeader = !!(error.config?.headers?.Authorization || error.config?.headers?.authorization);
        if (hasAuthHeader && (!auth || !auth.token)) {
            return Promise.reject(error);
        }

        if (status === 401) {
            if (isLoginRequest) {
                return Promise.reject(error);
            }

            // 401: Unauthorized / Session Expired
            clearAuth();
            
            const privatePaths = ['/profile', '/admin', '/author', '/moderator', '/translator', '/forum'];
            const currentPath = window.location.pathname;
            const isPrivate = privatePaths.some(path => currentPath.startsWith(path));
            
            if (isPrivate) {
                toast.error("Session expired. Please log in again!", {
                    toastId: "session-expired-401"
                });
                window.location.href = '/';
            }
        } 
        else if (status === 403 && !isLoginRequest) {
            // 403: Forbidden / Access Denied
            // Suppress global toast for background chat & workspace endpoints to prevent intrusive popups
            const isBackgroundEndpoint = requestUrl.includes('/chat/') || requestUrl.includes('/team-workspace/');
            if (!isBackgroundEndpoint) {
                toast.error("Access denied! There is an issue with your account permissions.", {
                    toastId: "forbidden-403"
                });
            }
        }
        else if (status === 500) {
            // 500: Internal Server Error
            toast.error("System error (Server Error). Please try again later!", {
                toastId: "server-error-500"
            });
        }

        return Promise.reject(error);
    }
);

export default AxiosClient;
