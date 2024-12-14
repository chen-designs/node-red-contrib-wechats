import FormData from 'form-data'
import { isEmpty, now, pick } from 'lodash-es'
import { createNode, evaluateNodeProperty, readBuffer } from '@/libs/utils'
import {QWechatApis} from '@/libs/apis'

export default function (RED) {
  RED.nodes.registerType('wechat-medias', function (config) {
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
        const media_id = await evaluateNodeProperty(config.media, config.media_type, this, msg, RED)
        const base64 = await evaluateNodeProperty(config.base64, config.base64_type, this, msg, RED)
        const type = await evaluateNodeProperty(config.ftype, config.ftype_type, this, msg, RED, value => {
          if (/^(image|voice|video|file)$/.test(value)) return value
          return 'file'
        })
        const filename = await evaluateNodeProperty(config.filename, config.filename_type, this, msg, RED, value => {
          if (!isEmpty(value)) return value
          return [now(), { image: 'png', voice: 'mp3', video: 'mp4', file: 'txt' }[value]].join('.')
        })
        const options = await evaluateNodeProperty(config.file, config.file_type, this, msg, RED, async value => {
          if (mode === 'get') return { params: { media_id }, responseType: 'arraybuffer' }
          const form = new FormData()
          form.append('media', await readBuffer(value, base64), filename)
          return { params: { type }, data: form, headers: form.getHeaders() }
        })
        await apis
          .medias(mode, options)
          .then(res => Object.assign({ filename }, pick(res, ['type', 'media_id'])))
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
