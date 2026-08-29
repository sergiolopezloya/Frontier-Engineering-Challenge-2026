#!/bin/bash
# Usage: ./deploy.sh [aws|gcp] [image_tag]
PLATFORM=$1
TAG=${2:-latest}
IMAGE_NAME="sample-react-app:$TAG"

if [ "$PLATFORM" == "aws" ]; then
  aws ecr get-login-password | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.region.amazonaws.com
  docker build -t $IMAGE_NAME .
  docker tag $IMAGE_NAME $AWS_ECR_URL/$IMAGE_NAME
  docker push $AWS_ECR_URL/$IMAGE_NAME
  aws ecs update-service --cluster my-cluster --service my-service --force-new-deployment
elif [ "$PLATFORM" == "gcp" ]; then
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME
  gcloud run deploy sample-react-app --image gcr.io/$PROJECT_ID/$IMAGE_NAME --platform managed
fi