import { isPlainObject, omit } from 'lodash-es'
import { QWechatApis } from '@/libs/apis'
import { createNode, evaluateNodeProperty } from '@/libs/utils'

export default function (RED) {
  RED.nodes.registerType('wechat-pusher', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis }
    if (!apis) this.error('没有配置正确的企业消息配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取配置数据
        const touser = await evaluateNodeProperty(config.touser, config.touser_type, this, msg, RED, value => value || '@all')
        const toparty = await evaluateNodeProperty(config.toparty, config.toparty_type, this, msg, RED)
        const totag = await evaluateNodeProperty(config.totag, config.totag_type, this, msg, RED)
        const msgtype = await evaluateNodeProperty(config.mtype, config.mtype_type, this, msg, RED, value => value || 'text')
        const safe = await evaluateNodeProperty(config.safe, config.safe_type, this, msg, RED)
        const params = await evaluateNodeProperty(config.content, config.content_type, this, msg, RED, value => {
          if (isPlainObject(value)) value = value[msgtype] || value
          else if (/text|markdown/.test(msgtype)) value = { content: String(value || '') }
          else if (/image|voice|video|file/.test(msgtype)) value = { media_id: String(value || '') }
          else if (/news/.test(msgtype)) value = { articles: [{ title: String(value || '') }] }
          else if (/textcard/.test(msgtype)) value = { description: String(value || '') }
          else throw new Error('消息内容只支持 JSON 格式')
          return { touser, toparty, totag, safe, msgtype, [msgtype]: value }
        })
        await apis
          .pusher(params)
          .then(res => omit(res, ['errcode', 'errmsg']))
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
