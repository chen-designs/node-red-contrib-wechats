import multer from 'multer'
import type { Response } from 'express'
import { compact, has, isNumber, pick } from 'lodash-es'
import { QWechatApis, QWechatCredentials } from '@/libs/apis'
import { createNode, evaluateNodeProperty, readIndex } from '@/libs/utils'

export default function (RED) {
  RED.nodes.registerType('wechat-acceptor', function (config) {
    const {} = createNode(RED, this, config)
    // 获取配置信息
    const { apis, credentials, onHandleWechatMessage } = RED.nodes.getNode(config.wechat) as { apis: QWechatApis; credentials: QWechatCredentials; [x: string]: any }
    if (!apis) this.error('没有配置正确的企业消息配置')
    // 消息接收地址
    const endpoint = `/${config.endpoint || credentials.agentid || this.id}`.replace(/^\/+/, '/')
    // 设置节点状态
    const setStatus = (text: string, fill: string = 'blue') => {
      return this.status({ text, shape: 'dot', fill: fill }), text
    }
    this.status({ text: `Running : ${endpoint}`, fill: 'blue', shape: 'dot' })
    // 接收企业微信消息
    const uploader = multer({ limits: { fileSize: 5 * 1024 * 1024 } })
    RED.httpNode.all(endpoint, uploader.single('file'), async (req, res: Response) => {
      try {
        setStatus(`Running : ${endpoint}`)
        // 获取响应超时时间
        const timeout = await evaluateNodeProperty<number>(config.timeout, config.timeout_type, this, {}, RED, value => {
          return (isNumber(value) ? value : parseInt(value, 10)) || 3 * 1000
        })
        // 处理请求
        if (req.method === 'GET') {
          const [{ timestamp, nonce, msg_signature }, echostr] = [req.query || {}, decodeURIComponent(req.query.echostr)]
          if (!apis.verify(timestamp, nonce, echostr, msg_signature)) res.send(readIndex())
          else res.status(200).send(apis.decrypt(echostr).message)
        } else if (has(req.query, 'msg_signature')) {
          // 设置响应超时时间
          res.setTimeout(Math.min(4500, timeout), () => res.status(200).json({ errcode: 0, errmsg: setStatus(`Timeout auto reply`, 'red') }))
          await onHandleWechatMessage(req, res, (err, payload) => {
            if (err) return this.warn(err)
            this.send([{ from_wechat: payload.FromUserName, req, res, payload, topic: `/${compact([payload.MsgType, payload.Event]).join('/')}` }])
          })
        } else {
          // 设置响应超时时间
          res.setTimeout(timeout, () => res.status(408).send({ errcode: 408, errmsg: setStatus(`Response timeout at ${timeout / 1000}s.`, 'red') }))
          if (!req.file) return this.send([null, { req, res, topic: '/others', payload: pick(req, ['query', 'params', 'body']) }])
          // 处理上传文件中文乱码问题
          const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
          this.send([null, { req, res, topic: '/upload', payload: Object.assign(req.file, { filename }) }])
        }
      } catch (error: any) {
        this.status({ fill: 'red', shape: 'dot', text: error.message })
        this.error(error)
      }
    })
    // 监听关闭事件
    this.on('close', () => {
      this.status({})
      RED.httpNode._router.stack.forEach(function (route, index, routes) {
        if (route.route && route.route.path === endpoint) routes.splice(index, 1)
      })
    })
  })
}
