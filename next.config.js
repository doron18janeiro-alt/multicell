/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  // Força o uso do Webpack para evitar conflito com Turbopack no build
  webpack: (config) => {
    return config;
  },
  // Configuração vazia para silenciar o erro do Next.js 16
  turbopack: {},
};

module.exports = withPWA(nextConfig);
