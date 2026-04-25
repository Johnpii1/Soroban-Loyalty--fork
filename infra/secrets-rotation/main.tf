terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region"       { default = "us-east-1" }
variable "db_host"          { description = "RDS endpoint" }
variable "db_port"          { default = 5432 }
variable "db_name"          { default = "soroban_loyalty" }
variable "db_username"      { default = "loyalty" }
variable "db_password"      { sensitive = true }
variable "rotation_days"    { default = 90 }
variable "alert_email"      { description = "Email for rotation audit alerts" }

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "soroban-loyalty"
      ManagedBy = "terraform"
    }
  }
}

# ── Secret ────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db" {
  name                    = "soroban-loyalty/db-credentials"
  description             = "SorobanLoyalty PostgreSQL credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_initial" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
  })
}

# ── Rotation Lambda (AWS-managed for RDS PostgreSQL) ─────────────────────────
data "aws_partition" "current" {}

resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_iam_account.current.account_id}:function:SecretsManagerRDSPostgreSQLRotationSingleUser"

  rotation_rules {
    automatically_after_days = var.rotation_days
  }

  depends_on = [aws_secretsmanager_secret_version.db_initial]
}

data "aws_iam_account" "current" {}

# ── CloudWatch log group for rotation audit trail ─────────────────────────────
resource "aws_cloudwatch_log_group" "db_rotation_audit" {
  name              = "/soroban-loyalty/db-credential-rotation"
  retention_in_days = 365
}

# ── SNS alert on rotation events ─────────────────────────────────────────────
resource "aws_sns_topic" "rotation_alerts" {
  name = "soroban-loyalty-db-rotation-alerts"
}

resource "aws_sns_topic_subscription" "rotation_email" {
  topic_arn = aws_sns_topic.rotation_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# EventBridge rule: fire on every Secrets Manager rotation event for this secret
resource "aws_cloudwatch_event_rule" "rotation_event" {
  name        = "soroban-loyalty-db-rotation"
  description = "Fires when DB credentials are rotated"
  event_pattern = jsonencode({
    source      = ["aws.secretsmanager"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["secretsmanager.amazonaws.com"]
      eventName   = ["RotateSecret", "PutSecretValue"]
      requestParameters = {
        secretId = [aws_secretsmanager_secret.db.arn]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "rotation_sns" {
  rule      = aws_cloudwatch_event_rule.rotation_event.name
  target_id = "RotationSNS"
  arn       = aws_sns_topic.rotation_alerts.arn
}

resource "aws_sns_topic_policy" "rotation_alerts" {
  arn = aws_sns_topic.rotation_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.rotation_alerts.arn
    }]
  })
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "secret_arn" {
  value       = aws_secretsmanager_secret.db.arn
  description = "Set this as DB_SECRET_ARN in the backend environment"
}
