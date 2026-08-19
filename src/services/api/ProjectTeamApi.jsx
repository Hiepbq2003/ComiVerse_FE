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

export const getTranslatorDashboardApi = () => {
  return AxiosClient.get('/project-teams/myprojects/dashboard');
};

export const getMyProjectTeamsPageApi = (page = 1, size = 4, search = '') => {
  return AxiosClient.get('/project-teams/myprojects/page', { params: { page, size, search } });
};

export const getProjectTeamsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/project-teams', { params: { page, size, search } });
};

export const createProjectTeamApi = (data) => {
  return AxiosClient.post('/project-teams', data);
};

export const updateProjectTeamApi = (id, data) => {
  // Explicitly whitelist properties to match ProjectTeamDTO on the Spring Boot backend EXACTLY.
  // This prevents 500 errors caused by nested objects or unknown fields like `comicId` or `createdAt`.
  const safeData = {
    id: id,
    title: data.title,
    comicName: data.comicName,
    status: data.status,
    membersCount: data.membersCount,
    chaptersCount: data.chaptersCount,
    progress: data.progress,
    leaderName: data.leaderName,
    leaderId: data.leaderId,
    leaderInitials: data.leaderInitials,
    deadline: data.deadline,
    sourceLang: data.sourceLang,
    targetLang: data.targetLang,
    priority: data.priority,
    cover: data.cover,
    description: data.description,
    notes: data.notes,
    comicTitle: data.comicTitle,
    assignedToMe: data.assignedToMe,
    isRecruiting: data.isRecruiting,
    maxMembers: data.maxMembers
  };

  // Remove undefined fields so we don't send nulls for missing values
  Object.keys(safeData).forEach(key => safeData[key] === undefined && delete safeData[key]);

  return AxiosClient.put(`/project-teams/${id}`, safeData);
};

export const deleteProjectTeamApi = (id) => {
  return AxiosClient.delete(`/project-teams/${id}`);
};