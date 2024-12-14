import Xml2js from 'xml2js'
import type { Request } from 'express'
import { camelCase, isPlainObject, upperFirst } from 'lodash-es'

export function createKeys(aesKey: string) {
  const key = Buffer.from(`${aesKey}=`, 'base64')
  if (key.length !== 32) throw new Error('encodingAESKey invalid')
  return { key, iv: key.subarray(0, 16) }
}
// 对需要加密的明文进行填充补位
export function pkcs7encode(buffer: Buffer) {
  const [blockSize, textLength] = [32, buffer.length]
  //计算需要填充的位数
  var amountToPad = blockSize - (textLength % blockSize)
  var result = Buffer.alloc(amountToPad, amountToPad)
  return Buffer.concat([buffer, result])
}
// 删除解密后明文的补位字符
export function pkcs7decode(buffer: Buffer) {
  var pad = buffer[buffer.length - 1]
  if (pad < 1 || pad > 32) pad = 0
  return buffer.subarray(0, buffer.length - pad)
}

export function parseBody(req: Request) {
  return new Promise<string>((resolve, reject) => {
    const buffer = [] as Buffer[]
    req.on('data', (trunk: Buffer) => buffer.push(trunk))
    req.on('end', () => resolve(Buffer.concat(buffer).toString('utf-8')))
    req.on('error', reject)
  })
}

export function parseXML(xml: string) {
  return new Promise<Record<string, any>>((resolve, reject) => {
    const opts = { trim: true, explicitArray: false, ignoreAttrs: true }
    Xml2js.parseString(xml, opts, (err, result) => {
      if (err) return reject(err)
      else resolve(result.xml)
    })
  })
}

export function parserify(xmls: string) {
  return new Promise<Record<string, any>>((resolve, reject) => {
    const opts = { trim: true, explicitArray: false, ignoreAttrs: true }
    Xml2js.parseString(xmls, opts, (err, result) => {
      if (err) return reject(err)
      else resolve(result.xml)
    })
  })
}
export function stringify(data: Record<string, any>) {
  const builder = new Xml2js.Builder({
    rootName: 'xml',
    cdata: true,
    headless: true,
    renderOpts: { pretty: false }
  })
  return builder.buildObject(data2upper(data || {}))
}

export function data2upper(data: Record<string, any>) {
  if (!isPlainObject(data) && !Array.isArray(data)) return data
  if (Array.isArray(data)) return data.map(item => data2upper(item))
  return Object.keys(data).reduce((res, key) => {
    const prop = upperFirst(camelCase(key))
    return Object.assign(res, { [prop]: data2upper(data[key]) })
  }, {} as Record<string, any>)
}
