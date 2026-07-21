import AxiosClient from './AxiosClient';

export const getAllProjectTeamsApi = () => {
  return AxiosClient.get('/project-teams/all');
};

// Chỉ trả về project team mà user đang đăng nhập là leader hoặc member (backend tự lọc
// qua bảng team_members) — dùng thay getAllProjectTeamsApi() cho màn hình danh sách
// project của translator, tránh tải toàn bộ project trong hệ thống rồi mới lọc bằng JS.
export const getMyProjectTeamsApi = () => {
  return AxiosClient.get('/project-teams/myprojects');
};

export const getProjectTeamsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/project-teams', { params: { page, size, search } });
};

export const createProjectTeamApi = (data) => {
  return AxiosClient.post('/project-teams', data);
};

export const updateProjectTeamApi = (id, data) => {
  return AxiosClient.put(`/project-teams/${id}`, data);
};

export const deleteProjectTeamApi = (id) => {
  return AxiosClient.delete(`/project-teams/${id}`);
};