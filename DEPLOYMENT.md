# AWS Elastic Beanstalk Deployment Guide

This guide explains how to deploy the application to AWS Elastic Beanstalk with health checks and CI/CD pipeline.

## Health Routes

The application now includes health check endpoints for AWS Elastic Beanstalk:

### Available Health Endpoints

1. **Basic Health Check**: `GET /health`

   - Returns basic application status
   - Used for general health monitoring

2. **Detailed Health Check**: `GET /health/detailed`

   - Returns comprehensive health information including:
     - Database connection status
     - Memory usage
     - Node.js version
     - Uptime

3. **AWS Health Check**: `GET /health/aws`
   - Lightweight endpoint specifically for AWS Elastic Beanstalk
   - Configured as the health check URL in Elastic Beanstalk

### Health Check Response Examples

**Basic Health Check** (`/health`):

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

**Detailed Health Check** (`/health/detailed`):

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": {
    "status": "connected",
    "readyState": 1
  },
  "memory": {
    "used": "45 MB",
    "total": "67 MB"
  },
  "version": "v18.17.0"
}
```

## CI/CD Setup

### GitHub Actions Workflow

The CI/CD pipeline is configured in `.github/workflows/deploy.yml` and includes:

1. **Test Job**: Runs on every push and pull request

   - Installs dependencies
   - Runs linting
   - Executes tests
   - Builds the application

2. **Deploy Job**: Runs only on main/master branch pushes
   - Creates deployment package
   - Deploys to AWS Elastic Beanstalk
   - Waits for deployment completion

### Required GitHub Secrets

Add these secrets to your GitHub repository:

1. **AWS Credentials**:

   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

2. **Elastic Beanstalk Configuration**:

   - `EB_APPLICATION_NAME`: Your Elastic Beanstalk application name
   - `EB_ENVIRONMENT_NAME`: Your Elastic Beanstalk environment name

3. **Database** (for testing):
   - `MONGODB_URI_TEST`: Test database connection string

### Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the appropriate name and value

## AWS Setup

### Prerequisites

1. **AWS Account**: Ensure you have an AWS account with appropriate permissions
2. **IAM User**: Create an IAM user with Elastic Beanstalk permissions
3. **Elastic Beanstalk Application**: Create an application in the AWS console

### Required IAM Permissions

Your IAM user needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticbeanstalk:*",
        "ec2:*",
        "ecs:*",
        "ecr:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "cloudwatch:*",
        "s3:*",
        "sns:*",
        "cloudformation:*",
        "rds:*",
        "sqs:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Elastic Beanstalk Configuration

The application includes configuration files:

1. **`.ebextensions/01_environment.config`**: Environment settings
2. **`Procfile`**: Application startup command
3. **`.ebignore`**: Files to exclude from deployment

### Environment Variables

Set these environment variables in your Elastic Beanstalk environment:

- `NODE_ENV`: production
- `PORT`: 8080
- `MONGODB_URI`: Your production MongoDB connection string
- Any other environment-specific variables

## Local Development

### Testing Health Routes

```bash
# Start the development server
npm run dev

# Test health endpoints
curl http://localhost:5000/health
curl http://localhost:5000/health/detailed
curl http://localhost:5000/health/aws
```

### Manual Deployment

If you need to deploy manually:

```bash
# Make the deployment script executable
chmod +x scripts/deploy.sh

# Set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export EB_APPLICATION_NAME="your-app-name"
export EB_ENVIRONMENT_NAME="your-env-name"
export EB_S3_BUCKET="your-s3-bucket"

# Run deployment
./scripts/deploy.sh
```

## Monitoring and Troubleshooting

### Health Check Monitoring

- Monitor the `/health/aws` endpoint in AWS CloudWatch
- Set up alarms for health check failures
- Configure auto-scaling based on health status

### Common Issues

1. **Health Check Failures**:

   - Check application logs in Elastic Beanstalk console
   - Verify database connectivity
   - Ensure environment variables are set correctly

2. **Deployment Failures**:

   - Check GitHub Actions logs
   - Verify AWS credentials and permissions
   - Ensure Elastic Beanstalk application and environment exist

3. **Performance Issues**:
   - Monitor memory usage via `/health/detailed`
   - Check auto-scaling configuration
   - Review application logs for errors

### Logs

Access application logs through:

- AWS Elastic Beanstalk console
- CloudWatch Logs
- Application logs in `/var/log/nodejs/`

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **IAM Permissions**: Use least privilege principle for IAM users
3. **Security Groups**: Configure appropriate security groups for your environment
4. **HTTPS**: Enable HTTPS in your Elastic Beanstalk environment
5. **Health Check Security**: Consider rate limiting for health endpoints in production

## Cost Optimization

1. **Instance Types**: Choose appropriate instance types for your workload
2. **Auto Scaling**: Configure auto-scaling to minimize costs
3. **Reserved Instances**: Consider reserved instances for predictable workloads
4. **Monitoring**: Use CloudWatch to monitor and optimize resource usage
