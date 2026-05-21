module.exports = {
  apps: [
    {
      name: 'cliniqueci-api',
      script: 'src/index.js',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/cliniqueci-error.log',
      out_file: '/var/log/pm2/cliniqueci-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
