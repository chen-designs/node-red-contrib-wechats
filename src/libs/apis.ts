import crypto from 'node:crypto'
import { Response } from 'express'
import { drop, pick } from 'lodash-es'
import { AxiosRequestConfig } from 'axios'
import { createKeys, pkcs7encode, pkcs7decode } from './message'
import BaseRequest from './request'

export type QWechatCredentials = { corpid: string; agentid: string; corpsecret: string; token: string; aeskey: string; proxy: string }
export type QRobotCredentials = { key: string; proxy: string }

export class QWechatApis extends BaseRequest {
  credentials = {} as QWechatCredentials
  #keys = {} as { key: Buffer; iv: Buffer }
  #access = { access_token: null, expires_in: 0, expires_at: +new Date() }

  constructor(options: QWechatCredentials) {
    super(options.proxy)
    this.credentials = options
    this.#keys = createKeys(options.aeskey)
  }
  private preAuth() {
    const expires = (+new Date() - this.#access.expires_at) / 1000
    if (this.#access.access_token && expires <= this.#access.expires_in) return Promise.resolve(this.#access)
    const { corpid, corpsecret } = this.credentials || {}
    return this.httpRequest({ url: '/cgi-bin/gettoken', params: { corpid, corpsecret } }).then(response => {
      return Promise.resolve(Object.assign(this.#access, { access_token: response.access_token, expires_in: response.expires_in, expires_at: +new Date() }))
    })
  }
  private request(url: string, options: AxiosRequestConfig) {
    return this.preAuth().then(({ access_token }) => {
      const params = Object.assign({ access_token }, options.params)
      return this.httpRequest(Object.assign({}, options, { params, url: url || options.url }))
    })
  }
  // 获取签名
  signature(timestamp: number, nonce: string, encrypt: string) {
    const shasum = crypto.createHash('sha1')
    const arr = [this.credentials.token, timestamp, nonce, encrypt].sort()
    return shasum.update(arr.join('')).digest('hex')
  }
  // 验证微信签名
  verify(timestamp: number, nonce: string, encrypt: string, signature: string) {
    return signature === this.signature(timestamp, nonce, encrypt)
  }
  // 加密消息
  encrypt(text: string) {
    // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
    // 获取16B的随机字符串
    const random = crypto.pseudoRandomBytes(16)
    const msg = Buffer.from(text)
    // 获取4B的内容长度的网络字节序
    const length = Buffer.alloc(4)
    length.writeUInt32BE(msg.length, 0)
    const corpid = Buffer.from(this.credentials.corpid)
    // 对明文进行补位操作
    const encoded = pkcs7encode(Buffer.concat([random, length, msg, corpid]))
    // 创建加密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
    const cipher = crypto.createCipheriv('aes-256-cbc', this.#keys.key, this.#keys.iv)
    cipher.setAutoPadding(false)
    const ciphered = Buffer.concat([cipher.update(encoded), cipher.final()])
    // 返回加密数据的base64编码
    return ciphered.toString('base64')
  }
  // 解密消息
  decrypt(text: string) {
    // 创建解密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.#keys.key, this.#keys.iv)
    decipher.setAutoPadding(false)
    const deciphered = Buffer.concat([decipher.update(text, 'base64'), decipher.final()])
    const decoded = pkcs7decode(deciphered)
    // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
    // 去除16位随机数
    var content = decoded.subarray(16)
    var length = content.subarray(0, 4).readUInt32BE(0)
    return { id: content.subarray(length + 4).toString(), message: content.subarray(4, length + 4).toString() }
  }
  // 发送消息
  pusher(params: any) {
    return this.request('/cgi-bin/message/send', {
      method: 'POST',
      data: Object.assign({}, params, { agentid: this.credentials.agentid })
    })
  }
  // 撤回消息
  revoke(params: any) {
    return this.request('/cgi-bin/message/recall', {
      method: 'POST',
      data: params
    })
  }
  // 回复消息
  reply(resp: Response, message: string, extra: any) {
    return new Promise((resolve, reject) => {
      try {
        if (!resp) throw new Error('无法获取 Response 对象')
        const encrypt = this.encrypt(message)
        const nonce = String(`${Math.random() * 100000000000}`).replace('.', '')
        const signature = this.signature(extra.timestamp, nonce, encrypt)
        const xmls = [
          '<xml>',
          `<Encrypt><![CDATA[${encrypt}]]></Encrypt>`, // 加密内容
          `<MsgSignature><![CDATA[${signature}]]></MsgSignature>`, // 数字签名
          `<TimeStamp>${extra.timestamp}</TimeStamp>`, // 时间戳
          `<Nonce><![CDATA[${nonce}]]></Nonce>`, // 随机数
          '</xml>'
        ].join('')
        resolve(resp.send(xmls))
      } catch (error) {
        reject(error)
      }
    })
  }
  // 自定义菜单
  menus(mode: number, agentid: string, params: any) {
    const url = ['get', 'create', 'delete'][mode || 0]
    return this.request(`/cgi-bin/menu/${url}`, {
      method: mode == 1 ? 'POST' : 'GET',
      params: { agentid: agentid || this.credentials.agentid },
      data: params
    })
  }
  // 素材管理
  medias(mode: string, options: any) {
    const method = mode === 'get' ? 'GET' : 'POST'
    return this.request(`/cgi-bin/media/${mode}`, { method, ...options }).then(response => {
      if (mode !== 'get') return response
      const [type] = response.headers['content-type'].split(';')
      const [filename] = drop(String(response.headers['content-disposition'] || '').match(/filename="(.*)";?/i) || [])
      return { type, filename, buffer: response.data }
    })
  }
  // 设置工作台
  works(mode: string, params: any) {
    const options = { agentid: this.credentials.agentid, userid: params.users[0], userid_list: params.users }
    const fields = {
      get_workbench_template: ['agentid'],
      set_workbench_template: ['agentid'],
      get_workbench_data: ['agentid', 'userid'],
      set_workbench_data: ['agentid', 'userid'],
      batch_set_workbench_data: ['agentid', 'userid_list']
    }
    return this.request(`/cgi-bin/agent/${mode}`, {
      method: 'POST',
      data: Object.assign({}, params.datas, pick(options, fields[mode] || []))
    })
  }
}

// 企业微信机器人 API
export class QRobotApis extends BaseRequest {
  credentials = {} as QRobotCredentials
  constructor(options: QRobotCredentials) {
    super(options.proxy)
    this.credentials = options
  }
  // 推送消息
  pusher(data: any) {
    return this.httpRequest({
      method: 'POST',
      url: '/cgi-bin/webhook/send',
      params: { key: this.credentials.key },
      data
    })
  }
  // 文件上传接口
  uploader({ type, ...options }: any) {
    return this.httpRequest({
      method: 'POST',
      url: '/cgi-bin/webhook/upload_media',
      params: { type, key: this.credentials.key },
      ...options
    })
  }
}
