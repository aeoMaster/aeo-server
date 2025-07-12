#!/bin/bash

# Deploy script for AWS Elastic Beanstalk
set -e

echo "🚀 Starting deployment process..."

# Check if required environment variables are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

if [ -z "$EB_APPLICATION_NAME" ] || [ -z "$EB_ENVIRONMENT_NAME" ]; then
    echo "❌ Elastic Beanstalk configuration not found. Please set EB_APPLICATION_NAME and EB_ENVIRONMENT_NAME"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📋 Creating deployment package..."
rm -rf deployment
mkdir -p deployment

# Copy necessary files
cp -r dist/* deployment/
cp package.json package-lock.json deployment/
cp Procfile deployment/

# Create .ebextensions directory
mkdir -p deployment/.ebextensions

# Create environment configuration
cat > deployment/.ebextensions/environment.config << EOF
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    NodeVersion: 18
EOF

# Create zip file
cd deployment
zip -r ../deployment.zip .
cd ..

echo "✅ Deployment package created: deployment.zip"

# Deploy to Elastic Beanstalk
echo "🚀 Deploying to Elastic Beanstalk..."
aws elasticbeanstalk create-application-version \
    --application-name "$EB_APPLICATION_NAME" \
    --version-label "deploy-$(date +%Y%m%d-%H%M%S)" \
    --source-bundle S3Bucket="$EB_S3_BUCKET",S3Key="deployment.zip" \
    --auto-create-application

aws elasticbeanstalk update-environment \
    --environment-name "$EB_ENVIRONMENT_NAME" \
    --version-label "deploy-$(date +%Y%m%d-%H%M%S)"

echo "✅ Deployment initiated successfully!"
echo "🌐 Check your Elastic Beanstalk console for deployment status" 