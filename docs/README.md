# 📚 AEO Server Documentation

Welcome to the AEO Server documentation. This folder contains all technical documentation organized by topic.

---

## 🚨 Troubleshooting

**If your server is down or having issues, start here:**

- **[SERVER_DOWN_CHECKLIST.md](./troubleshooting/SERVER_DOWN_CHECKLIST.md)** ⭐ - Step-by-step recovery checklist
- **[QUICK_FIX.md](./troubleshooting/QUICK_FIX.md)** - Fast recovery commands for common issues
- **[RECOVERY_GUIDE.md](./troubleshooting/RECOVERY_GUIDE.md)** - Comprehensive troubleshooting guide
- **[DEPLOYMENT_FIX_SUMMARY.md](./troubleshooting/DEPLOYMENT_FIX_SUMMARY.md)** - Latest deployment fixes explained

---

## 🚀 Deployment

Documentation for deploying and managing the server:

- **[DEPLOYMENT.md](./deployment/DEPLOYMENT.md)** - General deployment guide
- **[DOCKER_DEPLOYMENT.md](./deployment/DOCKER_DEPLOYMENT.md)** - Docker-specific deployment instructions
- **[README_DOCKER.md](./deployment/README_DOCKER.md)** - Docker setup and usage

---

## ⚙️ Setup & Configuration

Initial setup and environment configuration:

- **[AWS_SETUP_SUMMARY.md](./setup/AWS_SETUP_SUMMARY.md)** - AWS services configuration
- **[ENVIRONMENT_SETUP.md](./setup/ENVIRONMENT_SETUP.md)** - Environment variables and configuration

---

## 🔐 Cognito Authentication

AWS Cognito integration documentation:

- **[COGNITO_AUTH_IMPLEMENTATION.md](./cognito/COGNITO_AUTH_IMPLEMENTATION.md)** - Implementation details
- **[COGNITO_DATA_FLOW.md](./cognito/COGNITO_DATA_FLOW.md)** - Data flow diagrams
- **[COGNITO_IMPLEMENTATION_SUMMARY.md](./cognito/COGNITO_IMPLEMENTATION_SUMMARY.md)** - Implementation summary
- **[COGNITO_ROUTES_REFERENCE.md](./cognito/COGNITO_ROUTES_REFERENCE.md)** - API routes reference
- **[COGNITO_VERIFICATION.md](./cognito/COGNITO_VERIFICATION.md)** - Verification process

---

## ✨ Features & APIs

Feature documentation and API references:

- **[API_ENDPOINTS_REFERENCE.md](./features/API_ENDPOINTS_REFERENCE.md)** - Complete API endpoints documentation
- **[BLOG_FEATURE.md](./features/BLOG_FEATURE.md)** - Blog functionality
- **[CLARITY_SCANNER_API.md](./features/CLARITY_SCANNER_API.md)** - Clarity Scanner API
- **[TEAM_MEMBERS_TRACKING.md](./features/TEAM_MEMBERS_TRACKING.md)** - Team members management
- **[FRONTEND_DEVELOPER_PROMPT.md](./features/FRONTEND_DEVELOPER_PROMPT.md)** - Frontend integration guide
- **[best_practices.md](./features/best_practices.md)** - Development best practices

---

## 📂 Additional Resources

### Nginx Configuration

See `/nginx/README.md` for nginx setup and configuration

### Root Documentation

- Main project README: `../README.md`
- Environment template: `../env.template`

---

## 🔍 Quick Links by Topic

### First Time Setup

1. [Environment Setup](./setup/ENVIRONMENT_SETUP.md)
2. [AWS Setup](./setup/AWS_SETUP_SUMMARY.md)
3. [Docker Deployment](./deployment/DOCKER_DEPLOYMENT.md)
4. [API Endpoints](./features/API_ENDPOINTS_REFERENCE.md)

### Cognito Integration

1. [Implementation Summary](./cognito/COGNITO_IMPLEMENTATION_SUMMARY.md)
2. [Routes Reference](./cognito/COGNITO_ROUTES_REFERENCE.md)
3. [Data Flow](./cognito/COGNITO_DATA_FLOW.md)

### Troubleshooting

1. [Server Down?](./troubleshooting/SERVER_DOWN_CHECKLIST.md) ⭐ Start here!
2. [Quick Fix](./troubleshooting/QUICK_FIX.md)
3. [Recovery Guide](./troubleshooting/RECOVERY_GUIDE.md)

### Development

1. [Best Practices](./features/best_practices.md)
2. [Frontend Guide](./features/FRONTEND_DEVELOPER_PROMPT.md)
3. [API Reference](./features/API_ENDPOINTS_REFERENCE.md)

---

## 📝 Documentation Structure

```
docs/
├── README.md (this file)
├── troubleshooting/          # Server issues and fixes
│   ├── SERVER_DOWN_CHECKLIST.md
│   ├── QUICK_FIX.md
│   ├── RECOVERY_GUIDE.md
│   └── DEPLOYMENT_FIX_SUMMARY.md
├── deployment/               # Deployment guides
│   ├── DEPLOYMENT.md
│   ├── DOCKER_DEPLOYMENT.md
│   └── README_DOCKER.md
├── setup/                    # Initial setup
│   ├── AWS_SETUP_SUMMARY.md
│   └── ENVIRONMENT_SETUP.md
├── cognito/                  # Cognito auth
│   ├── COGNITO_AUTH_IMPLEMENTATION.md
│   ├── COGNITO_DATA_FLOW.md
│   ├── COGNITO_IMPLEMENTATION_SUMMARY.md
│   ├── COGNITO_ROUTES_REFERENCE.md
│   └── COGNITO_VERIFICATION.md
└── features/                 # Features & APIs
    ├── API_ENDPOINTS_REFERENCE.md
    ├── BLOG_FEATURE.md
    ├── CLARITY_SCANNER_API.md
    ├── TEAM_MEMBERS_TRACKING.md
    ├── FRONTEND_DEVELOPER_PROMPT.md
    └── best_practices.md
```

---

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Troubleshooting** - Server issues, fixes, recovery guides
2. **Deployment** - Deployment processes, CI/CD, Docker
3. **Setup** - Initial setup, configuration, environment
4. **Cognito** - Authentication and authorization
5. **Features** - Feature specs, API docs, integrations

Keep documentation up-to-date and well-organized!

---

## 📞 Need Help?

- Check [SERVER_DOWN_CHECKLIST.md](./troubleshooting/SERVER_DOWN_CHECKLIST.md) for common issues
- Review [API_ENDPOINTS_REFERENCE.md](./features/API_ENDPOINTS_REFERENCE.md) for API usage
- See [DEPLOYMENT.md](./deployment/DEPLOYMENT.md) for deployment questions

---

**Last Updated:** October 2025
