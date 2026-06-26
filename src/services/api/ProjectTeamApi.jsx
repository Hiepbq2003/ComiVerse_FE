import AxiosClient from './AxiosClient';

export const getAllProjectTeamsApi = () => {
  return AxiosClient.get('/project-teams/all');
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
