import axios, { AxiosRequestConfig } from 'axios'
import errcodes from './errcodes.json'

const API_HOST = String('https://qyapi.weixin.qq.com')
const isJson = (headers: any) => /application\/json/.test(headers['content-type'])

export default class BaseRequest {
  #proxy: string = API_HOST

  constructor(proxy?: string) {
    this.#proxy = proxy || API_HOST
  }
  protected httpRequest(options: AxiosRequestConfig) {
    const baseURL = this.#proxy || API_HOST
    return axios.request({ baseURL, method: 'GET', ...options }).then(response => {
      if (response.status === 200 && !isJson(response.headers)) return response
      if (response.status === 200 && response.data.errcode === 0) return response.data || {}
      return Promise.reject(new Error(errcodes[response.data.errcode] || response.statusText, { cause: response.data.errmsg }))
    })
  }
}
