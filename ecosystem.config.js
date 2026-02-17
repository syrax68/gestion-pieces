module.exports = {
  apps: [
    {
      name: "gestion-moto-backend",
      cwd: "/var/www/gestion-pieces-moto/packages/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "~/.pm2/logs/gestion-moto-error.log",
      out_file: "~/.pm2/logs/gestion-moto-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
