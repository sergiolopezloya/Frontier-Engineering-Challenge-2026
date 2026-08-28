#!/bin/bash
# Usage: ./deploy.sh [aws|gcp]
IMAGE_TAG=${1:-latest}

if [ "$1" == "aws" ]; then
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
  docker build -t microfrontend-widget .
  docker tag microfrontend-widget:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/microfrontend-widget:$IMAGE_TAG
  docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/microfrontend-widget:$IMAGE_TAG
  aws ecs update-service --cluster microfrontend-cluster --service widget-service --force-new-deployment
elif [ "$1" == "gcp" ]; then
  gcloud builds submit --tag gcr.io/[PROJECT_ID]/microfrontend-widget
  gcloud run deploy microfrontend-widget --image gcr.io/[PROJECT_ID]/microfrontend-widget --platform managed --region us-central1
fi