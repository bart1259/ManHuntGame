echo "Building docker image..."
sudo docker build -t "manhunt-image" --progress=plain ./

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
ECR_URL=$AWS_ACCOUNT_ID.dkr.ecr.us-east-2.amazonaws.com

echo "Logging into AWS Account $AWS_ACCOUNT_ID"
aws ecr get-login-password --region us-east-2 | sudo docker login --username AWS --password-stdin $ECR_URL

echo "Pushing docker image to ECR URL $ECR_URL"
sudo docker tag "manhunt-image:latest" $ECR_URL/manhunt-bartek-container-repo:latest
sudo docker push $ECR_URL/manhunt-bartek-container-repo:latest