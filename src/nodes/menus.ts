import { QWechatApis } from '@/libs/apis'
import { createNode, evaluateNodeProperty } from '@/libs/utils'

export default function (RED) {
  RED.nodes.registerType('wechat-menus', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis }
    if (!apis) this.error('没有配置正确的企业消息配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取配置数据
        const mode = await evaluateNodeProperty(config.mode, config.mode_type, this, msg, RED)
        const agentid = await evaluateNodeProperty(config.agentid, config.agentid_type, this, msg, RED, value => {
          return (value === 'auto' ? apis.credentials.agentid : value) || value
        })
        const menus = await evaluateNodeProperty(config.menus, config.menus_type, this, msg, RED)
        await apis
          .menus(mode, agentid, menus)
          .then(res => send(Object.assign(msg, { payload: res.button || [] })))
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
