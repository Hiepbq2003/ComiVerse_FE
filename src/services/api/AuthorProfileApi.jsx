import AxiosClient from './AxiosClient'

export const getAuthorProfileApi = () => {
  return AxiosClient.get('/author/profile')
}

export const saveAuthorProfileApi = (payload) => {
  return AxiosClient.put('/author/profile', payload)
}
