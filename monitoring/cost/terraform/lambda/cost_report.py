"""Weekly cost report Lambda — fetches AWS Cost Explorer data and publishes to SNS."""
import json
import os
import boto3
from datetime import date, timedelta


def handler(event, context):
    ce = boto3.client("ce", region_name="us-east-1")
    sns = boto3.client("sns")

    today = date.today()
    start = (today - timedelta(days=7)).isoformat()
    end = today.isoformat()

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start, "End": end},
        Granularity="DAILY",
        Filter={
            "Tags": {
                "Key": "Project",
                "Values": [os.environ.get("PROJECT_TAG", "soroban-loyalty")],
            }
        },
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        Metrics=["UnblendedCost"],
    )

    total = 0.0
    service_costs = {}
    for result in response["ResultsByTime"]:
        for group in result["Groups"]:
            svc = group["Keys"][0]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
            service_costs[svc] = service_costs.get(svc, 0.0) + amount
            total += amount

    lines = [
        f"SorobanLoyalty Weekly Cost Report ({start} → {end})",
        "=" * 55,
        "",
        f"Total: ${total:.2f}",
        "",
        "Per-service breakdown:",
    ]
    for svc, cost in sorted(service_costs.items(), key=lambda x: -x[1]):
        lines.append(f"  {svc:<40} ${cost:.2f}")

    lines += [
        "",
        "View full breakdown: https://console.aws.amazon.com/cost-management/home",
    ]

    sns.publish(
        TopicArn=os.environ["SNS_TOPIC_ARN"],
        Subject=f"SorobanLoyalty Weekly Cost Report — ${total:.2f}",
        Message="\n".join(lines),
    )

    return {"statusCode": 200, "total_usd": round(total, 2)}
