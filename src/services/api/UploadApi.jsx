import AxiosClient from './AxiosClient'

export const uploadImageApi = (file) => {
  const formData = new FormData()
  formData.append('file', file)

  return AxiosClient.post('/upload/image', formData, {
    timeout: 60000,
  })
}

export const uploadFileApi = (file) => {
  const formData = new FormData()
  formData.append('file', file)

  return AxiosClient.post('/upload/file', formData, {
    timeout: 60000,
  })
}
