terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "monthly_budget_usd" {
  description = "Monthly budget in USD"
  type        = number
  default     = 200
}

variable "alert_email" {
  description = "Email address for budget alerts and weekly cost reports"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "soroban-loyalty"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# ── SNS topic for budget alerts ───────────────────────────────────────────────
resource "aws_sns_topic" "cost_alerts" {
  name = "soroban-loyalty-cost-alerts"
}

resource "aws_sns_topic_subscription" "cost_alerts_email" {
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── Monthly budget with 80% and 100% alerts ───────────────────────────────────
resource "aws_budgets_budget" "monthly" {
  name         = "soroban-loyalty-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$soroban-loyalty"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.cost_alerts.arn]
  }
}

# ── Cost anomaly detection ────────────────────────────────────────────────────
resource "aws_ce_anomaly_monitor" "project" {
  name              = "soroban-loyalty-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "project" {
  name      = "soroban-loyalty-anomaly-alerts"
  frequency = "DAILY"

  monitor_arn_list = [aws_ce_anomaly_monitor.project.arn]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["10"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}

# ── Weekly cost report via Lambda + EventBridge ───────────────────────────────
resource "aws_iam_role" "cost_report_lambda" {
  name = "soroban-loyalty-cost-report-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "cost_report_lambda" {
  role = aws_iam_role.cost_report_lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ce:GetCostAndUsage", "ce:GetCostForecast"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.cost_alerts.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

data "archive_file" "cost_report" {
  type        = "zip"
  source_file = "${path.module}/lambda/cost_report.py"
  output_path = "${path.module}/lambda/cost_report.zip"
}

resource "aws_lambda_function" "cost_report" {
  filename         = data.archive_file.cost_report.output_path
  function_name    = "soroban-loyalty-weekly-cost-report"
  role             = aws_iam_role.cost_report_lambda.arn
  handler          = "cost_report.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.cost_report.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.cost_alerts.arn
      PROJECT_TAG   = "soroban-loyalty"
    }
  }
}

# Trigger every Monday at 08:00 UTC
resource "aws_cloudwatch_event_rule" "weekly_cost_report" {
  name                = "soroban-loyalty-weekly-cost-report"
  schedule_expression = "cron(0 8 ? * MON *)"
}

resource "aws_cloudwatch_event_target" "weekly_cost_report" {
  rule      = aws_cloudwatch_event_rule.weekly_cost_report.name
  target_id = "WeeklyCostReport"
  arn       = aws_lambda_function.cost_report.arn
}

resource "aws_lambda_permission" "weekly_cost_report" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_cost_report.arn
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "sns_topic_arn" {
  value       = aws_sns_topic.cost_alerts.arn
  description = "SNS topic ARN for cost alerts"
}

output "budget_name" {
  value       = aws_budgets_budget.monthly.name
  description = "AWS Budgets budget name"
}
