#!/bin/bash

# Complete AWS Elastic Beanstalk Setup Script
set -e

echo "🚀 Complete AWS Elastic Beanstalk Setup for Virginia Region (us-east-1)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    print_error "EB CLI is not installed. Please install it first:"
    echo "   pip install awsebcli"
    exit 1
fi

print_status "AWS CLI and EB CLI are installed"

# Install dependencies
print_info "Installing npm dependencies..."
npm install

# Build the application
print_info "Building the application..."
npm run build

# Run tests to ensure everything works
print_info "Running tests..."
npm test

print_status "All tests passed!"

# Prompt for application details
echo ""
print_info "Please provide the following information for your Elastic Beanstalk setup:"
echo ""

read -p "Enter your Elastic Beanstalk application name: " EB_APP_NAME
if [ -z "$EB_APP_NAME" ]; then
    print_error "Application name is required"
    exit 1
fi

read -p "Enter your Elastic Beanstalk environment name: " EB_ENV_NAME
if [ -z "$EB_ENV_NAME" ]; then
    print_error "Environment name is required"
    exit 1
fi

read -p "Enter your S3 bucket name for deployments: " S3_BUCKET
if [ -z "$S3_BUCKET" ]; then
    print_error "S3 bucket name is required"
    exit 1
fi

# Create .elasticbeanstalk directory and config
print_info "Creating Elastic Beanstalk configuration..."
mkdir -p .elasticbeanstalk

cat > .elasticbeanstalk/config.yml << EOF
branch-defaults:
  main:
    environment: $EB_ENV_NAME
    group_suffix: null

global:
  application_name: $EB_APP_NAME
  branch: null
  default_ec2_keyname: null
  default_platform: Node.js 20
  default_region: us-east-1
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: git
  workspace_type: Application
EOF

# Create .ebignore if it doesn't exist
if [ ! -f ".ebignore" ]; then
    print_info "Creating .ebignore file..."
    cp .gitignore .ebignore
fi

# Initialize EB application
print_info "Initializing Elastic Beanstalk application..."
eb init "$EB_APP_NAME" \
    --region us-east-1 \
    --platform "Node.js 20" \
    --source codecommit/default

# Create environment
print_info "Creating Elastic Beanstalk environment..."
eb create "$EB_ENV_NAME" \
    --instance-type t3.small \
    --single-instance \
    --envvars NODE_ENV=production,PORT=8080

# Create S3 bucket if it doesn't exist
print_info "Setting up S3 bucket for deployments..."
aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null || {
    print_info "Creating S3 bucket: $S3_BUCKET"
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region us-east-1
}

# Create IAM role for Elastic Beanstalk if it doesn't exist
print_info "Setting up IAM roles..."
aws iam get-role --role-name aws-elasticbeanstalk-ec2-role 2>/dev/null || {
    print_info "Creating IAM role for Elastic Beanstalk..."
    
    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create the role
    aws iam create-role \
        --role-name aws-elasticbeanstalk-ec2-role \
        --assume-role-policy-document file:///tmp/trust-policy.json

    # Attach necessary policies
    aws iam attach-role-policy \
        --role-name aws-elasticbeanstalk-ec2-role \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier

    aws iam attach-role-policy \
        --role-name aws-elasticbeanstalk-ec2-role \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker

    aws iam attach-role-policy \
        --role-name aws-elasticbeanstalk-ec2-role \
        --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier

    # Create instance profile
    aws iam create-instance-profile \
        --instance-profile-name aws-elasticbeanstalk-ec2-role

    aws iam add-role-to-instance-profile \
        --instance-profile-name aws-elasticbeanstalk-ec2-role \
        --role-name aws-elasticbeanstalk-ec2-role

    # Clean up
    rm /tmp/trust-policy.json
}

# Test health endpoints locally
print_info "Testing health endpoints locally..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test health endpoints
print_info "Testing health endpoints..."
curl -s http://localhost:5000/health | jq . || print_warning "Health endpoint test failed"
curl -s http://localhost:5000/health/detailed | jq . || print_warning "Detailed health endpoint test failed"
curl -s http://localhost:5000/health/aws | jq . || print_warning "AWS health endpoint test failed"

# Stop dev server
kill $DEV_PID 2>/dev/null || true

print_status "Local health endpoint tests completed!"

# Create deployment package
print_info "Creating initial deployment package..."
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
    NodeVersion: 20
EOF

# Create zip file
cd deployment
zip -r ../deployment.zip .
cd ..

print_status "Deployment package created: deployment.zip"

# Final setup summary
echo ""
print_status "🎉 Complete setup finished successfully!"
echo ""
print_info "📋 Configuration Summary:"
echo "   - Region: us-east-1 (Virginia)"
echo "   - Node.js Version: 18"
echo "   - Application Name: $EB_APP_NAME"
echo "   - Environment Name: $EB_ENV_NAME"
echo "   - S3 Bucket: $S3_BUCKET"
echo ""
print_warning "🔐 REQUIRED: Add the following secrets to your GitHub repository:"
echo "   Go to: Settings → Secrets and variables → Actions"
echo "   Add these secrets:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - EB_APPLICATION_NAME: $EB_APP_NAME"
echo "   - EB_ENVIRONMENT_NAME: $EB_ENV_NAME"
echo "   - MONGODB_URI_TEST (for testing)"
echo ""
print_info "🌐 Your application will be available at:"
echo "   https://$EB_ENV_NAME.us-east-1.elasticbeanstalk.com"
echo ""
print_info "🚀 To deploy:"
echo "   git add ."
echo "   git commit -m 'Complete AWS Elastic Beanstalk setup'"
echo "   git push origin main"
echo ""
print_info "📊 Health check endpoints:"
echo "   - Basic: https://$EB_ENV_NAME.us-east-1.elasticbeanstalk.com/health"
echo "   - Detailed: https://$EB_ENV_NAME.us-east-1.elasticbeanstalk.com/health/detailed"
echo "   - AWS: https://$EB_ENV_NAME.us-east-1.elasticbeanstalk.com/health/aws" 