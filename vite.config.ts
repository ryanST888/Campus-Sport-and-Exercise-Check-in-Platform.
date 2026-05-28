import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.COZE_API_BASE': JSON.stringify(env.COZE_API_BASE),
      'process.env.COZE_API_TOKEN': JSON.stringify(env.COZE_API_TOKEN),
      'process.env.COZE_WORKFLOW_ID': JSON.stringify(env.COZE_WORKFLOW_ID),
      'process.env.COZE_POLICY_WORKFLOW_ID': JSON.stringify(env.COZE_POLICY_WORKFLOW_ID),
      'process.env.COZE_CHAT_WORKFLOW_ID': JSON.stringify(env.COZE_CHAT_WORKFLOW_ID),
      'process.env.COZE_BOT_ID': JSON.stringify(env.COZE_BOT_ID),
      'process.env.COZE_APP_ID': JSON.stringify(env.COZE_APP_ID),
      'process.env.COZE_PARAMETERS_FORMAT': JSON.stringify(env.COZE_PARAMETERS_FORMAT),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
