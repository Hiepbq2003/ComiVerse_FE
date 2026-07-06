import AxiosClient from './AxiosClient'

export const uploadImageApi = (file) => {
  const formData = new FormData()
  formData.append('file', file)

  return AxiosClient.post('/upload/image', formData, {
    timeout: 60000,
  })
}
