#!/usr/bin/env bash
set -euo pipefail

# CLI Variables and Config defaults
APP_NAME="sample-react-app"
AWS_REGION="us-east-1"
GCP_REGION="us-central1"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
VITE_BACKEND_URL="${VITE_BACKEND_URL:-https://api.production.internal}"

usage() {
    echo "Usage: $0 [aws|gcp]"
    echo "Ensure environment variables AWS_ACCOUNT_ID or GCP_PROJECT_ID are set."
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

PROVIDER=$1

deploy_aws() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        echo "[-] Error: AWS_ACCOUNT_ID environment variable is missing."
        exit 1
    fi
    echo "[+] Beginning AWS Elastic Container Service (ECS) deployment pipeline..."
    
    # Securely retrieve login token for AWS ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Compile container passing environmental variable target
    docker build \
        --build-arg VITE_BACKEND_URL="$VITE_BACKEND_URL" \
        -t "$APP_NAME:latest" .
        
    # Tag image matching repository URI
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME:latest"
    docker tag "$APP_NAME:latest" "$ECR_URI"
    
    # Push target
    docker push "$ECR_URI"
    
    # Trigger Rolling Update deployment
    echo "[+] Updating Active Task Definition in ECS Cluster..."
    aws ecs update-service --cluster "$APP_NAME-cluster" --service "$APP_NAME-service" --force-new-deployment --region "$AWS_REGION"
    echo "[+] Deployment Complete on AWS ECS!"
}

deploy_gcp() {
    if [ -z "$GCP_PROJECT_ID" ]; then
        echo "[-] Error: GCP_PROJECT_ID environment variable is missing."
        exit 1
    fi
    echo "[+] Beginning GCP Cloud Run deployment pipeline..."
    
    # Configure local credentials for GCP Artifact Registry
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet
    
    # Build within Google Cloud Build engine securely pushing registry target
    gcloud builds submit --tag "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/gcr.io/$APP_NAME:latest" \
        --build-arg VITE_BACKEND_URL="$VITE_BACKEND_URL" .
        
    # Deploy target to Cloud Run
    gcloud run deploy "$APP_NAME" \
        --image "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/gcr.io/$APP_NAME:latest" \
        --platform managed \
        --region "$GCP_REGION" \
        --allow-unauthenticated \
        --port 80
    echo "[+] Deployment Complete on GCP Cloud Run!"
}

case "$PROVIDER" in
    aws)
        deploy_aws
        ;;
    gcp)
        deploy_gcp
        ;;
    *)
        usage
        ;;
esac