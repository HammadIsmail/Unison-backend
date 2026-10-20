module.exports = {
  apps: [
    {
      name: 'unison-backend',
      script: 'dist/main.js',
      instances: 'max', // Scale to all CPU cores
      exec_mode: 'cluster', // Enables clustering mode
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '1G', // Restart if RAM exceeds 1GB
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
