import AxiosClient from './AxiosClient'

export const getAuthorProfileApi = () => {
  return AxiosClient.get('/author/profile')
}

export const saveAuthorProfileApi = (payload) => {
  return AxiosClient.put('/author/profile', payload)
}

export const uploadAuthorLicenseApi = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return AxiosClient.post('/author/profile/license', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
