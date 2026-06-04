import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 相対パスでのビルド出力（GitHub Pages等でサブディレクトリに配置されても動作するようにする）
})
