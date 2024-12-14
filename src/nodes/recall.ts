import { QWechatApis } from '@/libs/apis'
import { createNode, evaluateNodeProperty } from '@/libs/utils'

export default function (RED) {
  RED.nodes.registerType('wechat-recall', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis }
    if (!apis) this.error('没有配置正确的企业消息配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取消息 ID
        const msgid = await evaluateNodeProperty(config.msgid, config.msgid_type, this, msg, RED, value => String(value || ''))
        await apis
          .revoke({ msgid })
          .then(() => send(Object.assign(msg, { payload: { msgid } })))
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
