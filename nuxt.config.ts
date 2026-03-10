import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app/',
  serverDir: 'server/',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/data/**', '**/.nuxt/**']
      }
    }
  },
  css: ["./app/tailwind.css"],
  runtimeConfig: {
    teslaClientId: process.env.TESLA_CLIENT_ID,
    teslaClientSecret: process.env.TESLA_CLIENT_SECRET,
    teslaRedirectUri: process.env.TESLA_REDIRECT_URI,
    teslaAuthUrl: process.env.TESLA_AUTH_URL,
    teslaTokenUrl: process.env.TESLA_TOKEN_URL,
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    sessionMaxAgeDays: process.env.SESSION_MAX_AGE_DAYS || '30',
    tursoDbUrl: process.env.TURSO_DB_URL || 'file:data/tesla.db',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    mcpApiKey: process.env.MCP_API_KEY || '',
    public: {
      teslaRedirectUri: process.env.TESLA_REDIRECT_URI
    }
  },
})
