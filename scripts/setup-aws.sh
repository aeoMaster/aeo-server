#!/bin/bash

# AWS Elastic Beanstalk Setup Script
set -e

echo "🚀 Setting up AWS Elastic Beanstalk deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI is not installed. Please install it first:"
    echo "   pip install awsebcli"
    exit 1
fi

echo "✅ AWS CLI and EB CLI are installed"

# Prompt for configuration
read -p "Enter your AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Enter your Elastic Beanstalk application name: " EB_APP_NAME
if [ -z "$EB_APP_NAME" ]; then
    echo "❌ Application name is required"
    exit 1
fi

read -p "Enter your Elastic Beanstalk environment name: " EB_ENV_NAME
if [ -z "$EB_ENV_NAME" ]; then
    echo "❌ Environment name is required"
    exit 1
fi

read -p "Enter your S3 bucket name for deployments: " S3_BUCKET
if [ -z "$S3_BUCKET" ]; then
    echo "❌ S3 bucket name is required"
    exit 1
fi

# Create .ebignore if it doesn't exist
if [ ! -f ".ebignore" ]; then
    echo "📝 Creating .ebignore file..."
    cp .gitignore .ebignore
fi

# Initialize EB application
echo "🔧 Initializing Elastic Beanstalk application..."
eb init "$EB_APP_NAME" \
    --region "$AWS_REGION" \
    --platform "Node.js 18" \
    --source codecommit/default

# Create environment
echo "🌍 Creating Elastic Beanstalk environment..."
eb create "$EB_ENV_NAME" \
    --instance-type t3.small \
    --single-instance \
    --envvars NODE_ENV=production,PORT=8080

# Create deployment configuration
echo "📋 Creating deployment configuration..."
cat > .elasticbeanstalk/config.yml << EOF
branch-defaults:
  main:
    environment: $EB_ENV_NAME
    group_suffix: null

global:
  application_name: $EB_APP_NAME
  branch: null
  default_ec2_keyname: null
  default_platform: Node.js 18
  default_region: $AWS_REGION
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: git
  workspace_type: Application
EOF

# Update GitHub Actions workflow with correct values
echo "🔧 Updating GitHub Actions workflow..."
sed -i.bak "s/us-east-1/$AWS_REGION/g" .github/workflows/deploy.yml

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add the following secrets to your GitHub repository:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - EB_APPLICATION_NAME: $EB_APP_NAME"
echo "   - EB_ENVIRONMENT_NAME: $EB_ENV_NAME"
echo "   - MONGODB_URI_TEST (for testing)"
echo ""
echo "2. Update your environment variables in Elastic Beanstalk:"
echo "   - MONGODB_URI"
echo "   - JWT_SECRET"
echo "   - Other application-specific variables"
echo ""
echo "3. Test your deployment:"
echo "   git add ."
echo "   git commit -m 'Add AWS Elastic Beanstalk configuration'"
echo "   git push origin main"
echo ""
echo "🌐 Your application will be available at:"
echo "   https://$EB_ENV_NAME.$AWS_REGION.elasticbeanstalk.com" 