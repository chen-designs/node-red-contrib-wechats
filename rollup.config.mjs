import glob from 'fast-glob'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import strip from '@rollup/plugin-strip'
import json from '@rollup/plugin-json'
import clear from 'rollup-plugin-clear'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  input: glob.sync('src/nodes/*.ts'),
  output: { dir: 'nodes', format: 'cjs' },
  external: ['mustache', 'axios', 'multer', 'xml2js', 'form-data'],
  plugins: [
    commonjs({ strictRequires: true }), // 支持打包cjs模块
    typescript({ tsconfig: './tsconfig.json' }), //
    resolve(), // 支持打包node_modules中的模块
    // terser({}), // 压缩代码
    strip(), // 删除调试代码
    json(), // 支持打包json文件
    clear({ targets: ['nodes'] }), // 清空目录
    copy({
      targets: [
        { src: 'src/nodes/*.html', dest: 'nodes' },
        { src: 'src/locales/', dest: 'nodes' },
        { src: 'src/icons/', dest: 'nodes' }
      ]
    }) // 复制文件
  ]
})
