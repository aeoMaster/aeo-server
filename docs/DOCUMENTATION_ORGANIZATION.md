# 📁 Documentation Organization

All documentation has been organized into the `docs/` folder with logical categories.

## 📂 New Structure

```
docs/
├── README.md                          # Main documentation index
│
├── troubleshooting/                   # 🚨 Server Issues & Fixes
│   ├── SERVER_DOWN_CHECKLIST.md      # ⭐ Step-by-step recovery checklist
│   ├── QUICK_FIX.md                  # Fast recovery commands
│   ├── RECOVERY_GUIDE.md             # Comprehensive troubleshooting
│   └── DEPLOYMENT_FIX_SUMMARY.md     # Latest deployment fixes
│
├── deployment/                        # 🚀 Deployment Guides
│   ├── DEPLOYMENT.md                 # General deployment guide
│   ├── DOCKER_DEPLOYMENT.md          # Docker-specific deployment
│   └── README_DOCKER.md              # Docker setup and usage
│
├── setup/                             # ⚙️ Initial Setup
│   ├── AWS_SETUP_SUMMARY.md          # AWS services configuration
│   └── ENVIRONMENT_SETUP.md          # Environment variables
│
├── cognito/                           # 🔐 Authentication
│   ├── COGNITO_AUTH_IMPLEMENTATION.md      # Implementation details
│   ├── COGNITO_DATA_FLOW.md                # Data flow diagrams
│   ├── COGNITO_IMPLEMENTATION_SUMMARY.md   # Implementation summary
│   ├── COGNITO_ROUTES_REFERENCE.md         # API routes reference
│   └── COGNITO_VERIFICATION.md             # Verification process
│
└── features/                          # ✨ Features & APIs
    ├── API_ENDPOINTS_REFERENCE.md    # Complete API documentation
    ├── BLOG_FEATURE.md               # Blog functionality
    ├── CLARITY_SCANNER_API.md        # Clarity Scanner API
    ├── TEAM_MEMBERS_TRACKING.md      # Team members management
    ├── FRONTEND_DEVELOPER_PROMPT.md  # Frontend integration guide
    └── best_practices.md             # Development best practices
```

## 📊 Summary

| Category            | Files  | Purpose                        |
| ------------------- | ------ | ------------------------------ |
| **Troubleshooting** | 4      | Server issues, recovery, fixes |
| **Deployment**      | 3      | Deployment guides and Docker   |
| **Setup**           | 2      | Initial configuration and AWS  |
| **Cognito**         | 5      | Authentication implementation  |
| **Features**        | 6      | Feature docs and API reference |
| **Total**           | **20** | Well-organized documentation   |

## 🎯 Quick Navigation

### 🆘 Having Issues?

Start with: [`troubleshooting/SERVER_DOWN_CHECKLIST.md`](./troubleshooting/SERVER_DOWN_CHECKLIST.md)

### 🚀 Deploying?

Go to: [`deployment/DOCKER_DEPLOYMENT.md`](./deployment/DOCKER_DEPLOYMENT.md)

### 📖 Need API Docs?

Check: [`features/API_ENDPOINTS_REFERENCE.md`](./features/API_ENDPOINTS_REFERENCE.md)

### 🔐 Working on Auth?

See: [`cognito/`](./cognito/) folder

## 🔍 Finding Documentation

### By Topic

1. **Troubleshooting** → `docs/troubleshooting/`
2. **Deployment** → `docs/deployment/`
3. **Setup** → `docs/setup/`
4. **Authentication** → `docs/cognito/`
5. **Features** → `docs/features/`

### By Priority

1. ⭐ **Critical/Urgent** → `docs/troubleshooting/SERVER_DOWN_CHECKLIST.md`
2. **Deployment** → `docs/deployment/`
3. **Features** → `docs/features/`
4. **Reference** → All other docs

## 📝 Documentation Standards

When adding new documentation:

### Naming Convention

- Use descriptive names in UPPERCASE with underscores
- Example: `NEW_FEATURE_GUIDE.md`

### File Placement

1. **Troubleshooting** - Error fixes, recovery procedures
2. **Deployment** - CI/CD, Docker, deployment processes
3. **Setup** - Initial configuration, prerequisites
4. **Cognito** - Authentication and authorization
5. **Features** - Feature specifications, API docs

### Required Elements

- Clear title and purpose
- Table of contents (for long docs)
- Code examples where applicable
- Links to related documentation
- Last updated date

## 🔄 Migration Notes

### What Changed

- ✅ All `.md` files moved from root to `docs/`
- ✅ Organized into 5 logical categories
- ✅ Created comprehensive index (`docs/README.md`)
- ✅ Updated main `README.md` with links
- ✅ Only `README.md` remains in root

### Benefits

- 📁 Cleaner root directory
- 🔍 Easier to find relevant docs
- 📚 Better organization
- 🚀 Improved navigation
- 💡 Clear categories

## 🔗 External Resources

- **Nginx Configuration**: [`/nginx/README.md`](../nginx/README.md)
- **Environment Template**: [`/env.template`](../env.template)
- **Main README**: [`/README.md`](../README.md)

---

**Last Updated:** October 2025  
**Maintained by:** Development Team
