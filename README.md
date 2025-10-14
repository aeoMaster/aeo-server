# AI Content Analyzer API Server

A TypeScript-based Express server for the AI Content Analyzer application, providing authentication and content analysis features.

## Features

- User authentication (email/password and Google OAuth)
- JWT-based authentication
- Content analysis using OpenAI's GPT-4
- TypeScript with strict type checking
- MongoDB integration
- Zod validation
- Error handling middleware
- Environment-based configuration

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- OpenAI API key
- Google OAuth credentials

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `OPENAI_API_KEY`: OpenAI API key
- `CLIENT_URL`: Frontend application URL

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Content Analysis

- `POST /api/analyze` - Analyze content or URL

## Development

- Run tests: `npm test`
- Lint code: `npm run lint`
- Format code: `npm run format`
- Build for production: `npm run build`

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Environment variables are used for sensitive data
- Input validation using Zod
- Error handling middleware
- CORS configuration

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) folder:

- **🚨 [Troubleshooting](./docs/troubleshooting)** - Server issues and recovery guides
- **🚀 [Deployment](./docs/deployment)** - Deployment and Docker guides
- **⚙️ [Setup](./docs/setup)** - AWS and environment configuration
- **🔐 [Cognito](./docs/cognito)** - Authentication implementation
- **✨ [Features](./docs/features)** - API reference and features

📖 **[Browse All Documentation](./docs/README.md)**

### Quick Links

- [🆘 Server Down?](./docs/troubleshooting/SERVER_DOWN_CHECKLIST.md) - Start here for issues
- [🐳 Docker Deployment](./docs/deployment/DOCKER_DEPLOYMENT.md) - Deploy with Docker
- [📡 API Reference](./docs/features/API_ENDPOINTS_REFERENCE.md) - Complete API docs
- [🔧 Nginx Configuration](./nginx/README.md) - Nginx setup

## License

MIT
