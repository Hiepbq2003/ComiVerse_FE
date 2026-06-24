export const getAuth = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token) {
    try {
      return {
        token,
        user: user ? JSON.parse(user) : null
      };
    } catch (e) {
      return { token, user: null };
    }
  }
  return null;
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
};
