import { QWechatApis } from '@/libs/apis'
import { parseBody, parseXML } from '@/libs/message'
import { createNode, STR_EMPTY } from '@/libs/utils'
import type { Request, Response } from 'express'

export default function (RED) {
  const Configurator = function (config) {
    try {
      const { credentials } = createNode(RED, this, config)
      const apis = (this.apis = new QWechatApis({
        corpid: RED.util.evaluateNodeProperty(credentials.corpid || STR_EMPTY, credentials.corpid_type, this),
        agentid: RED.util.evaluateNodeProperty(credentials.agentid || STR_EMPTY, credentials.agentid_type, this),
        corpsecret: RED.util.evaluateNodeProperty(credentials.secret || STR_EMPTY, credentials.secret_type, this),
        token: RED.util.evaluateNodeProperty(credentials.token || STR_EMPTY, credentials.token_type, this),
        aeskey: RED.util.evaluateNodeProperty(credentials.aeskey || STR_EMPTY, credentials.aeskey_type, this),
        proxy: RED.util.evaluateNodeProperty(credentials.proxy || STR_EMPTY, credentials.proxy_type, this)
      }))
      // 处理企业微信消息解析
      this.onHandleWechatMessage = function (req: Request, res: Response, onHandler: (err: Error | null, result?: Record<string, any>) => any) {
        const processHandler = (err: Error | null, result?: Record<string, any>) => {
          if (err) res.status(500).end(err?.message || err || 'Failure')
          return onHandler(err, result)
        }
        return Promise.resolve(parseBody(req))
          .then(result => parseXML(result))
          .then(result => apis.decrypt(result.Encrypt))
          .then(result => parseXML(result.message))
          .then(result => processHandler(null, result))
          .catch(err => processHandler(err))
      }
    } catch (error) {
      this.error(error)
    }
  }
  RED.nodes.registerType('wechat-configurator', Configurator, {
    credentials: {
      corpid: { type: 'text', required: true },
      corpid_type: { type: 'text' },
      agentid: { type: 'text', required: true },
      agentid_type: { type: 'text' },
      secret: { type: 'text', required: true },
      secret_type: { type: 'text' },
      token: { type: 'text', required: true },
      token_type: { type: 'text' },
      aeskey: { type: 'text', required: true },
      aeskey_type: { type: 'text' },
      proxy: { type: 'text' },
      proxy_type: { type: 'text' }
    }
  })
}
