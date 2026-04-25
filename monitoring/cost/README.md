# Infrastructure Cost Monitoring — SorobanLoyalty

AWS cost monitoring with budget alerts, anomaly detection, and weekly reports.

## What's Included

| Component | Description |
|---|---|
| AWS Budgets | Monthly budget with 80% and 100% alerts |
| Cost Anomaly Detection | Alerts on unexpected cost spikes ≥ $10 |
| Weekly Cost Report | Lambda runs every Monday, emails per-service breakdown |
| Cost Allocation Tags | Tags all resources with `Project=soroban-loyalty` |

## Setup

### 1. Apply cost allocation tags to existing resources

```bash
cd monitoring/cost
AWS_REGION=us-east-1 ENVIRONMENT=production bash tag-resources.sh
```

Then activate the `Project` tag in AWS Cost Explorer:
**Billing → Cost Allocation Tags → Activate**

### 2. Deploy budget alerts and anomaly detection

```bash
cd monitoring/cost/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your budget and email

terraform init
terraform apply
```

Confirm the SNS email subscription when you receive the confirmation email.

### 3. View cost dashboard

- **AWS Cost Explorer**: https://console.aws.amazon.com/cost-management/home
- Filter by tag `Project = soroban-loyalty` for per-project view
- Use **Group by: Service** for per-service breakdown

## Alert Thresholds

| Alert | Threshold | Type |
|---|---|---|
| Budget warning | 80% of monthly budget | Actual spend |
| Budget exceeded | 100% of monthly budget | Actual spend |
| Budget forecast | 100% of monthly budget | Forecasted spend |
| Anomaly | ≥ $10 unexpected increase | Daily |

## Weekly Cost Report

Automatically emailed every Monday at 08:00 UTC. Contains:
- Total spend for the past 7 days
- Per-service cost breakdown
- Link to AWS Cost Explorer for full details

## Cost Optimization

Review monthly:
- **Compute Optimizer**: https://console.aws.amazon.com/compute-optimizer
- **Trusted Advisor**: https://console.aws.amazon.com/trustedadvisor
- Right-size underutilized EC2/RDS instances
- Review data transfer costs between services
- Check for unused Elastic IPs and idle load balancers

## Tagging Convention

All resources must carry these tags:

| Tag | Value |
|---|---|
| `Project` | `soroban-loyalty` |
| `Environment` | `production` / `staging` |
| `ManagedBy` | `terraform` |
