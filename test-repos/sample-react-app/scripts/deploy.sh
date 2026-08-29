#!/bin/bash
# Usage: ./deploy.sh [aws|gcp] [image-tag]
PROVIDER=$1
TAG=${2:-latest}

if [ "$PROVIDER" == "aws" ]; then
  aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
  docker build -t $REPO_NAME:$TAG .
  docker push $REPO_NAME:$TAG
  aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment
elif [ "$PROVIDER" == "gcp" ]; then
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$REPO_NAME:$TAG
  gcloud run deploy $SERVICE_NAME --image gcr.io/$PROJECT_ID/$REPO_NAME:$TAG --platform managed
fi