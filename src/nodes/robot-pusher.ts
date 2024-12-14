import md5 from 'md5'
import { compact, isPlainObject, isString } from 'lodash-es'
import { createNode, evaluateNodeProperty, readBuffer } from '@/libs/utils'
import { QRobotApis } from '@/libs/apis'

export default function (RED) {
  RED.nodes.registerType('wechat-robot-pusher', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.robot) as { apis: QRobotApis }
    if (!apis) this.error('没有配置正确的企业机器人配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取数据
        const msgtype = await evaluateNodeProperty(config.msgtype, config.msgtype_type, this, msg, RED, value => value || 'text')
        const mentioned_list = await evaluateNodeProperty(config.touser, config.touser_type, this, msg, RED, value => {
          if (Array.isArray(value)) return value
          return compact(String(value || '').split('|'))
        })
        // 手机号列表
        const mentioned_mobile_list = await evaluateNodeProperty(config.tomobile, config.tomobile_type, this, msg, RED, value => {
          if (Array.isArray(value)) return value
          return compact(String(value || '').split('|'))
        })
        // 消息内容
        const params = await evaluateNodeProperty(config.content, config.content_type, this, msg, RED, async value => {
          if (isPlainObject(value)) value = value[msgtype] || value
          else if (/text/.test(msgtype)) value = { content: String(value || ''), mentioned_list, mentioned_mobile_list }
          else if (/markdown/.test(msgtype)) value = { content: String(value || '') }
          else if (/voice|file/.test(msgtype)) value = { media_id: String(value || '') }
          else if (/news/.test(msgtype)) value = { articles: [{ title: String(value || '') }] }
          else if (/image/.test(msgtype)) value = await readBuffer(value, isString(value)).then(buffer => ({ base64: buffer.toString('base64'), md5: md5(buffer) }))
          else throw new Error('消息内容只支持 JSON 格式')
          return { msgtype, [msgtype]: value }
        })
        await apis
          .pusher(params)
          .then(payload => send(Object.assign(msg, { payload })))
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
