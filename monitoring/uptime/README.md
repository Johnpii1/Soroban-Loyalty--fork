# Uptime Monitoring — SorobanLoyalty

External uptime monitoring for the SorobanLoyalty platform using [Uptime Kuma](https://github.com/louislam/uptime-kuma) (self-hosted) or [UptimeRobot](https://uptimerobot.com) (managed).

## Services Monitored

| Service | URL | Check Interval |
|---|---|---|
| Frontend | `https://sorobanloyalty.com` | 60s |
| Backend API | `https://api.sorobanloyalty.com/health` | 60s |
| Soroban RPC | `https://rpc.sorobanloyalty.com/soroban/rpc` | 60s |

## Status Page

Public status page: **https://status.sorobanloyalty.com**

- Real-time service status
- Incident history (90 days)
- Maintenance window scheduling

## Quick Start (Self-Hosted with Uptime Kuma)

```bash
# Start Uptime Kuma
cd monitoring/uptime
docker-compose up -d

# Open UI and create admin account
open http://localhost:3002

# Provision monitors automatically
KUMA_URL=http://localhost:3002 \
KUMA_USER=admin \
KUMA_PASS=yourpassword \
FRONTEND_URL=https://sorobanloyalty.com \
BACKEND_URL=https://api.sorobanloyalty.com \
RPC_URL=https://rpc.sorobanloyalty.com/soroban/rpc \
bash provision-monitors.sh
```

After provisioning, configure the status page in the Uptime Kuma UI:
1. Go to **Status Pages** → **New Status Page**
2. Set slug to `soroban-loyalty`
3. Add all three monitors
4. Set domain to `status.sorobanloyalty.com`

## Quick Start (UptimeRobot — Managed)

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. Import `uptime-robot-config.json` or create monitors manually using the values in that file
3. Create a public status page at `status.sorobanloyalty.com` via **My Settings → Status Pages**
4. Set alert contacts to reach the on-call engineer (email/SMS/Slack)

## Alert Configuration

- **Alert threshold**: 1 failed check triggers alert
- **Alert window**: within 60 seconds of downtime detection
- **Notification channels**: Email, Slack, PagerDuty (configure in Uptime Kuma → Notifications)

## Maintenance Windows

Schedule maintenance windows in Uptime Kuma under **Maintenance** to suppress alerts during planned downtime.

## Monthly Uptime Report

A report is auto-generated on the 1st of each month. To set up:

```bash
# Add to crontab
crontab -e
# Add this line:
0 8 1 * * KUMA_URL=http://localhost:3002 KUMA_USER=admin KUMA_PASS=secret REPORT_EMAIL=team@sorobanloyalty.com /path/to/monitoring/uptime/monthly-report.sh
```
