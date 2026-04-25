#!/usr/bin/env bash
# Applies cost allocation tags to all SorobanLoyalty AWS resources.
# Requires AWS CLI configured with sufficient IAM permissions.
#
# Usage: AWS_PROFILE=myprofile AWS_REGION=us-east-1 ./tag-resources.sh

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="soroban-loyalty"
ENV="${ENVIRONMENT:-production}"

TAGS="Key=Project,Value=$PROJECT Key=Environment,Value=$ENV Key=ManagedBy,Value=terraform"

echo "Tagging SorobanLoyalty resources in $REGION..."

# Tag EC2 instances
INSTANCE_IDS=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Project,Values=$PROJECT" \
  --query "Reservations[].Instances[].InstanceId" --output text 2>/dev/null || true)

if [[ -n "$INSTANCE_IDS" ]]; then
  # shellcheck disable=SC2086
  aws ec2 create-tags --region "$REGION" --resources $INSTANCE_IDS --tags $TAGS
  echo "  Tagged EC2 instances: $INSTANCE_IDS"
fi

# Tag RDS instances
RDS_IDS=$(aws rds describe-db-instances --region "$REGION" \
  --query "DBInstances[?contains(DBInstanceIdentifier,'soroban-loyalty')].DBInstanceArn" \
  --output text 2>/dev/null || true)

for arn in $RDS_IDS; do
  aws rds add-tags-to-resource --region "$REGION" --resource-name "$arn" \
    --tags "Key=Project,Value=$PROJECT" "Key=Environment,Value=$ENV"
  echo "  Tagged RDS: $arn"
done

# Tag ECS services
CLUSTER=$(aws ecs list-clusters --region "$REGION" \
  --query "clusterArns[?contains(@,'soroban-loyalty')]|[0]" --output text 2>/dev/null || true)

if [[ -n "$CLUSTER" && "$CLUSTER" != "None" ]]; then
  aws ecs tag-resource --region "$REGION" --resource-arn "$CLUSTER" \
    --tags "key=Project,value=$PROJECT" "key=Environment,value=$ENV"
  echo "  Tagged ECS cluster: $CLUSTER"
fi

echo "Done. Cost allocation tags applied."
echo "Enable tags in AWS Cost Explorer: https://console.aws.amazon.com/billing/home#/tags"
