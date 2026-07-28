import axios from 'axios';
import { getAuth, clearAuth, setAuth } from '../../utils/Auth';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../config/apiConfig';

const AxiosClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb, errCb) => {
    refreshSubscribers.push({ cb, errCb });
};

const onRefreshed = (token) => {
    refreshSubscribers.forEach(({ cb }) => cb(token));
    refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
    refreshSubscribers.forEach(({ errCb }) => errCb(error));
    refreshSubscribers = [];
};

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
            const originalRequest = error.config;
            if (isLoginRequest || originalRequest.url.includes('/auth/refresh') || originalRequest._retry) {
                return Promise.reject(error);
            }

            if (auth && auth.user) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    if (!isRefreshing) {
                        isRefreshing = true;

                        axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
                            .then(res => {
                                const newAuth = res.data?.data || res.data;
                                setAuth(newAuth.token, auth.user, newAuth.refreshToken);
                                isRefreshing = false;
                                onRefreshed(newAuth.token);
                            })
                            .catch(refreshErr => {
                                isRefreshing = false;
                                onRefreshFailed(refreshErr);
                                clearAuth();
                                const privatePaths = ['/profile', '/admin', '/author', '/moderator', '/translator', '/forum'];
                                const currentPath = window.location.pathname;
                                const isPrivate = privatePaths.some(path => currentPath.startsWith(path));
                                if (isPrivate) {
                                    toast.error("Session expired. Please log in again!", { toastId: "session-expired-401" });
                                    window.location.href = '/';
                                }
                            });
                    }

                    originalRequest._retry = true;
                    return new Promise((resolve, reject) => {
                        subscribeTokenRefresh(
                            (newToken) => {
                                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                resolve(AxiosClient(originalRequest));
                            },
                            (err) => {
                                reject(err);
                            }
                        );
                    });
                }
            }

            // 401: Unauthorized / Session Expired (Fallback)
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
            // Suppress global toast for background chat, workspace endpoints, and GET queries to prevent intrusive popups
            const isBackgroundOrFallbackEndpoint = 
                error.config?.suppressToast || 
                error.config?.headers?.['X-Suppress-Toast'] ||
                requestUrl.includes('/chat/') || 
                requestUrl.includes('/team-workspace/') ||
                requestUrl.includes('/notifications') ||
                error.config?.method === 'get';

            if (!isBackgroundOrFallbackEndpoint) {
                toast.error("Access denied! There is an issue with your account permissions.", {
                    toastId: "forbidden-403"
                });
            }
        }
        else if (status === 500) {
            // 500: Internal Server Error
            // Suppress global toast for background endpoints and GET data queries that have frontend fallback pipelines
            const isBackgroundOrFallbackEndpoint = 
                error.config?.suppressToast || 
                error.config?.headers?.['X-Suppress-Toast'] ||
                requestUrl.includes('/chat/') || 
                requestUrl.includes('/chat-flags/') || 
                requestUrl.includes('/team-workspace/') ||
                requestUrl.includes('/notifications') ||
                requestUrl.includes('/comics') || 
                requestUrl.includes('/chapters') || 
                requestUrl.includes('/submissions') || 
                requestUrl.includes('/project-teams') ||
                requestUrl.includes('/translation-pool') ||
                requestUrl.includes('/genres') ||
                requestUrl.includes('/broadcasts') ||
                error.config?.method === 'get';

            if (!isBackgroundOrFallbackEndpoint) {
                toast.error("System error (Server Error). Please try again later!", {
                    toastId: "server-error-500"
                });
            }
        }

        return Promise.reject(error);
    }
);

export default AxiosClient;
