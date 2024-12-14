import FormData from 'form-data'
import { isString, pick } from 'lodash-es'
import { createNode, evaluateNodeProperty, readBuffer } from '@/libs/utils'
import { QRobotApis } from '@/libs/apis'

export default function (RED) {
  RED.nodes.registerType('wechat-robot-uploader', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis } = RED.nodes.getNode(config.robot) as { apis: QRobotApis }
    if (!apis) this.error('没有配置正确的企业机器人配置')
    // 监听输入
    this.on('input', async (msg, send, done) => {
      try {
        this.status({ fill: 'blue', shape: 'dot', text: 'Running' })
        // 获取配置数据
        const type = await evaluateNodeProperty(config.ftype, config.ftype_type, this, msg, RED)
        const filename = await evaluateNodeProperty(config.filename, config.filename_type, this, msg, RED)
        const options = await evaluateNodeProperty(config.content, config.content_type, this, msg, RED, async value => {
          const form = new FormData()
          form.append('media', await readBuffer(value, isString(value)), filename)
          return { type, data: form, headers: form.getHeaders() }
        })
        await apis
          .uploader(options)
          .then(res => pick(res, ['type', 'media_id', 'created_at']))
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
