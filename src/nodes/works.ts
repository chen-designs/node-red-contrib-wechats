import { compact } from 'lodash-es'
import { createNode, evaluateNodeProperty } from '@/libs/utils'
import {QWechatApis} from '@/libs/apis'

export default function (RED) {
  RED.nodes.registerType('wechat-works', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis }
    if (!apis) this.error('没有配置正确的企业消息配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取数据
        const mode = await evaluateNodeProperty(config.mode, config.mode_type, this, msg, RED)
        const datas = await evaluateNodeProperty(config.data, config.data_type, this, msg, RED)
        const users = await evaluateNodeProperty(config.user, config.user_type, this, msg, RED, value => {
          if (Array.isArray(value)) return value
          return compact(String(value || '').split('|'))
        })
        await apis
          .works(mode, { datas, users })
          .then(res => send(Object.assign(msg, { payload: Object.assign(datas, res) })))
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
