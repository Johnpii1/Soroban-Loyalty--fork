# infra/secrets/main.tf
# Provisions the AWS Secrets Manager secret for Soroban Loyalty and configures
# 90-day automatic rotation for the database password via a Lambda rotator.
#
# Prerequisites:
#   - AWS provider configured (region via AWS_REGION or provider block)
#   - A rotation Lambda deployed (see rotation_lambda_arn variable)
#   - terraform init && terraform apply

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "rotation_lambda_arn" {
  description = "ARN of the SecretsManager rotation Lambda for PostgreSQL"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

provider "aws" {
  region = var.aws_region
}

# ── Main application secret ───────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "app" {
  name        = "soroban-loyalty/production"
  description = "All application secrets for Soroban Loyalty (DB, contract IDs)"

  tags = {
    Project     = "soroban-loyalty"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "app_initial" {
  secret_id = aws_secretsmanager_secret.app.id
  # Populate via: aws secretsmanager put-secret-value --secret-id soroban-loyalty/production --secret-string file://secrets.json
  # Never store real values in Terraform state or source control.
  secret_string = jsonencode({
    DATABASE_URL         = "REPLACE_ME"
    POSTGRES_PASSWORD    = "REPLACE_ME"
    REWARDS_CONTRACT_ID  = ""
    CAMPAIGN_CONTRACT_ID = ""
    TOKEN_CONTRACT_ID    = ""
  })

  lifecycle {
    # Prevent Terraform from overwriting secrets managed outside of Terraform.
    ignore_changes = [secret_string]
  }
}

# ── 90-day automatic rotation for database credentials ───────────────────────
resource "aws_secretsmanager_secret_rotation" "db_rotation" {
  secret_id           = aws_secretsmanager_secret.app.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# ── IAM policy — allow ECS task / K8s service account to read the secret ─────
data "aws_iam_policy_document" "read_secret" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.app.arn]
  }
}

resource "aws_iam_policy" "read_secret" {
  name        = "soroban-loyalty-read-secret"
  description = "Allow application to read the Soroban Loyalty secret"
  policy      = data.aws_iam_policy_document.read_secret.json
}

output "secret_arn" {
  description = "ARN to set as SECRETS_ARN env var in the application"
  value       = aws_secretsmanager_secret.app.arn
}

output "iam_policy_arn" {
  description = "Attach this policy to the ECS task role or K8s IRSA role"
  value       = aws_iam_policy.read_secret.arn
}
