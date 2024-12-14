import FormData from 'form-data'
import { Response } from 'express'
import { get, pick } from 'lodash-es'
import { QWechatApis } from '@/libs/apis'
import { parserify, stringify } from '@/libs/message'
import { createNode, evaluateNodeProperty, readBuffer } from '@/libs/utils'

export default function (RED) {
  RED.nodes.registerType('wechat-reply', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis }
    if (!apis) this.error('没有配置正确的企业消息配置')
    const RESPONSE_TYPES = { text: 'text/plain', xml: 'text/xml', json: 'application/json', file: 'application/octet-stream' }
    // 上传素材
    const mediaUploader = (type: 'image', buffer: Buffer, filename: string, extra: any) => {
      const form = new FormData()
      form.append('media', buffer, filename)
      return apis.medias('upload', { params: { type }, data: form, headers: form.getHeaders() }).then(result => {
        return stringify(Object.assign(extra, { MsgType: type, Image: { MediaId: result.media_id } }))
      })
    }
    // 发送响应内容
    const responseHandler = (res: Response, type: keyof typeof RESPONSE_TYPES, content: Buffer, filename: string) => {
      res.type(RESPONSE_TYPES[type])
      if (type === 'json') return res.json(content)
      if (type !== 'file') return res.send(content)
      return res.attachment(filename).end(content)
    }
    // 监听输入
    this.on('input', async ({ res, from_wechat, ...msg }, _, done) => {
      try {
        if (!res) throw new Error('No http response object')
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        const timestamp = new Date().getTime()
        const options = Object.assign({ timestamp, CreateTime: timestamp }, msg, pick(apis.credentials, ['corpid', 'agentid']))
        const extra = { FromUserName: apis.credentials.corpid, ToUserName: from_wechat, CreateTime: timestamp }
        // 获取消息内容
        const type = await evaluateNodeProperty(config.rtype, config.rtype_type, this, msg, RED, value => value || 'json')
        const filename = await evaluateNodeProperty(config.filename, config.filename_type, this, msg, RED)
        const content = await evaluateNodeProperty(config.content, null as any, this, options, RED, async value => {
          if (type === 'file' && from_wechat) return mediaUploader('image', await readBuffer(value || msg.payload, true), filename || `${timestamp}.png`, extra)
          else if (type === 'file') return readBuffer(value || msg.payload)
          else if (type === 'json' && from_wechat) return stringify(Object.assign(extra, JSON.parse(value || JSON.stringify(msg.payload))))
          else if (type === 'json') return JSON.parse(value || JSON.stringify(msg.payload))
          else if (type === 'xml' && from_wechat) return stringify(Object.assign(extra, await parserify(value || msg.payload)))
          else if (type === 'xml') return stringify(await parserify(String(value || msg.payload)))
          else if (from_wechat) return stringify(Object.assign(extra, { MsgType: 'text', Content: value }))
          else return value
        })
        await Promise.resolve(from_wechat ? apis.reply(res, content, options) : responseHandler(res, type, content, filename || `${timestamp}.txt`))
          .then(() => this.status({ fill: 'green', shape: 'dot', text: 'Success' }))
          .finally(done)
      } catch (error: any) {
        if (done) done(error)
        this.status({ fill: 'red', shape: 'dot', text: error.message })
      }
    })
    // 监听关闭事件
    this.on('close', () => this.status({}))
  })
}
