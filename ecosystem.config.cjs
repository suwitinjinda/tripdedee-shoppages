module.exports = {
  apps: [
    {
      name: 'shoppages',
      script: './dist/server/entry.mjs',
      cwd: '/home/munmunsignal/tripdedee-shoppages',
      env: {
        HOST: '127.0.0.1',
        PORT: '8090',
        BACKEND_URL: 'http://127.0.0.1:5000',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
    },
  ],
};
