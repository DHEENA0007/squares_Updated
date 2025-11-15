module.exports = {
  apps: [{
    name: 'squares-api',
    script: 'server/index.js',
    cwd: '/var/www/squares-v2',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLIENT_URL: 'https://buildhomemartsquares.com/v2'
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/squares-api-error.log',
    out_file: '/var/log/squares-api-out.log',
    log_file: '/var/log/squares-api.log',
    time: true,
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
