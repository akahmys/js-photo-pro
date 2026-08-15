import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 相対パスでのビルド出力（GitHub Pages等でサブディレクトリに配置されても動作するようにする）
});
