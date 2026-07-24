import stompService from '../services/websocket/StompService';

export const getAuth = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && token !== 'undefined' && token !== 'null') {
    try {
      if (user && user !== 'undefined' && user !== 'null') {
        return {
          token,
          user: JSON.parse(user)
        };
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    return { token, user: null };
  }
  return null;
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refreshToken');
  try {
    stompService.disconnect();
  } catch (e) {
    console.warn("Failed to disconnect WebSocket on logout:", e);
  }
};

export const setAuth = (token, user, refreshToken) => {
  if (!token || token === 'undefined' || token === 'null') {
    clearAuth();
    return;
  }
  localStorage.setItem('token', token);
  if (user && user !== 'undefined' && user !== 'null') {
    localStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};
