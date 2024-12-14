import fs from 'node:fs'
import path from 'node:path'
import mustache from 'mustache'
import { extend, isFunction, isString } from 'lodash-es'

export const STR_EMPTY = String('')

export function evaluateNodeProperty<T = any>(value: string, type: string, node: any, msg: any, RED: any, processHandler?: (value: any) => T | Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const result = isString(value) ? mustache.render(value, msg) : value
    RED.util.evaluateNodeProperty(result, type, node, msg, (err: any, res: any) => {
      if (err) return reject(err)
      return resolve(isFunction(processHandler) ? processHandler(res || null) : res || null)
    })
  })
}

export function createNode(RED: any, ctx: any, config: any) {
  return extend((RED.nodes.createNode(ctx, config), ctx), config)
}

export async function readBuffer(value: any, base64?: any) {
  if (value instanceof Buffer) return value
  else if (isString(value)) return Buffer.from(value.replace(/data:.*?,/, ''), /^data:/.test(value) || base64 ? 'base64' : 'utf8')
  else if (value instanceof Blob || value instanceof File) return Buffer.from(await value.arrayBuffer())
  return Buffer.from(value)
}

export function readIndex(data?: Record<string, any>) {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8')
  return data ? mustache.render(html, data) : html
}
