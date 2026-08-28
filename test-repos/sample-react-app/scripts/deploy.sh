#!/usr/bin/env bash
set -euo pipefail

# Configuration Variables
PLATFORM="${1:-}"
REGION="${AWS_REGION:-us-east-1}"
IMAGE_NAME="sample-react-app"
TAG="${IMAGE_TAG:-latest}"

print_usage() {
    echo "Usage: $0 [aws-ecs | gcp-cloud-run]"
    exit 1
}

if [ -z "$PLATFORM" ]; then
    print_usage
fi

if [ "$PLATFORM" == "aws-ecs" ]; then
    echo "[INFO] Starting deployment to AWS ECS..."
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
    FULL_IMAGE_URI="${ECR_REGISTRY}/${IMAGE_NAME}:${TAG}"

    echo "[INFO] Authenticating with AWS ECR..."
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

    echo "[INFO] Building Docker image..."
    docker build -t "${IMAGE_NAME}:${TAG}" .

    echo "[INFO] Tagging image for ECR..."
    docker tag "${IMAGE_NAME}:${TAG}" "$FULL_IMAGE_URI"

    echo "[INFO] Pushing image to ECR..."
    docker push "$FULL_IMAGE_URI"

    echo "[INFO] Forcing ECS service update..."
    aws ecs update-service --cluster production-cluster --service sample-react-app-service --force-new-deployment --region "$REGION"
    echo "[SUCCESS] AWS ECS deployment triggered successfully!"

elif [ "$PLATFORM" == "gcp-cloud-run" ]; then
    echo "[INFO] Starting deployment to GCP Cloud Run..."
    
    GCP_PROJECT_ID="${GCP_PROJECT_ID:?Environment variable GCP_PROJECT_ID is required}"
    GCP_REGION="${GCP_REGION:-us-central1}"
    FULL_IMAGE_URI="gcr.io/${GCP_PROJECT_ID}/${IMAGE_NAME}:${TAG}"

    echo "[INFO] Building and submitting via Google Cloud Build..."
    gcloud builds submit --tag "$FULL_IMAGE_URI" .

    echo "[INFO] Deploying to Cloud Run..."
    gcloud run deploy sample-react-app \
        --image "$FULL_IMAGE_URI" \
        --platform managed \
        --region "$GCP_REGION" \
        --allow-unauthenticated \
        --port 80

    echo "[SUCCESS] GCP Cloud Run deployment completed successfully!"

else
    echo "[ERROR] Unknown target platform: $PLATFORM"
    print_usage
fi
