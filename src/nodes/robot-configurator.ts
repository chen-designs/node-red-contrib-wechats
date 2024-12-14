import { QRobotApis } from '@/libs/apis'
import { createNode, STR_EMPTY } from '@/libs/utils'

export default function (RED) {
  const Configurator = function (config) {
    try {
      const { credentials } = createNode(RED, this, config)
      this.apis = new QRobotApis({
        key: RED.util.evaluateNodeProperty(credentials.key || STR_EMPTY, credentials.key_type, this),
        proxy: RED.util.evaluateNodeProperty(credentials.proxy || STR_EMPTY, credentials.proxy_type, this)
      })
    } catch (error) {
      this.error(error)
    }
  }
  RED.nodes.registerType('wechat-robot-configurator', Configurator, {
    credentials: {
      key: { type: 'text', required: true },
      key_type: { type: 'text' },
      proxy: { type: 'text' },
      proxy_type: { type: 'text' }
    }
  })
}
