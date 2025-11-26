module.exports = {
  apps: [{
    name: "crm-backend",
    script: "./index.js",
    env_production: {
      NODE_ENV: "production"
    }
  }]
}
