# Incident Response Playbook

This document defines the standard operating procedures for handling production incidents at SorobanLoyalty.

## 1. Severity Classification

Incidents are classified into four severity levels based on business impact and urgency.

| Severity | Description | Examples |
|---|---|---|
| **P1 - Critical** | **Catastrophic failure** causing complete platform outage, severe data loss, or active security breach. Immediate, all-hands response required. | Database deleted/corrupted, Soroban RPC connection permanently refused, LYT token minting vulnerability exploited. |
| **P2 - High** | **Major functionality broken** affecting many customers, but the platform is partially up. No immediate data loss. | Indexer stuck (lag > 100 blocks), users cannot claim rewards, Next.js frontend returning 500 errors. |
| **P3 - Medium** | **Minor functionality broken** or degraded performance affecting a small subset of users or non-critical paths. | Merchant analytics dashboard loading slowly, specific campaign showing wrong metadata, minor cosmetic frontend bugs. |
| **P4 - Low** | **No direct customer impact**. Internal tooling issues, minor alerts, or planned maintenance delays. | Grafana dashboard failing to load for internal team, minor spelling error in UI, staging environment down. |

---

## 2. Escalation Paths

When an incident is declared (either via Prometheus/Alertmanager automation or manual report), follow the appropriate escalation path based on its severity.

### P1 (Critical)
- **Time to Acknowledge (TTA)**: 5 Minutes
- **Action**: PagerDuty immediately pages the Primary On-Call Engineer.
- **Escalation (if no ACK in 5m)**: Pages Secondary On-Call, then Engineering Manager, then CTO.
- **War Room**: A dedicated Slack channel (`#inc-YYYYMMDD-critical`) and Google Meet are immediately created.

### P2 (High)
- **Time to Acknowledge (TTA)**: 15 Minutes
- **Action**: PagerDuty pages the Primary On-Call Engineer.
- **Escalation (if no ACK in 15m)**: Pages Secondary On-Call, then Engineering Manager.
- **War Room**: A dedicated Slack channel (`#inc-YYYYMMDD-high`) is created.

### P3 (Medium)
- **Time to Acknowledge (TTA)**: Next business day (or within 4 hours during business hours).
- **Action**: Slack notification sent to the `#engineering-alerts` channel.
- **Escalation**: If unresolved after 24 hours, escalate to Engineering Manager.
- **War Room**: Handled asynchronously in a Slack thread.

### P4 (Low)
- **Time to Acknowledge (TTA)**: Triage in the next sprint planning.
- **Action**: Jira ticket created automatically or manually.
- **Escalation**: None.

---

## 3. Communication Templates

During P1 and P2 incidents, keeping users informed via our Status Page is critical. Use these templates.

### 3.1 Initial Incident (Investigating)
**Subject:** Investigating Issue with [Feature/Service]
**Body:** We are currently investigating reports of an issue affecting [Feature/Service, e.g., Reward Claiming]. Our engineering team is actively looking into the root cause. We will provide an update within [Time, e.g., 30 minutes].

### 3.2 Update (Identified)
**Subject:** Update on [Feature/Service] Issue
**Body:** We have identified the root cause of the issue affecting [Feature/Service]. The problem was caused by [Brief, non-technical explanation, e.g., an overloaded database node]. We are currently working on implementing a fix. Next update in [Time].

### 3.3 Resolution (Resolved)
**Subject:** Resolved: Issue with [Feature/Service]
**Body:** The issue affecting [Feature/Service] has been successfully resolved. Systems are operating normally. We apologize for the inconvenience and will publish a detailed post-mortem in the coming days.

---

## 4. On-Call Rotation Schedule

We operate a weekly follow-the-sun on-call rotation. The schedule is managed via PagerDuty.

- **Shift Transition**: Mondays at 10:00 AM (Local Time).
- **Primary On-Call**: First responder to all alerts. Responsible for initial triage and running the playbook.
- **Secondary On-Call**: Backup responder if Primary is unreachable or requires assistance.
- **Incident Commander (IC)**: For P1 incidents, the Engineering Manager or a senior engineer steps in as IC to manage communication, allowing the Primary On-Call to focus purely on technical resolution.

**Expectations:**
- Acknowledge pages within the SLA.
- If stepping away (unavailable), coordinate a temporary override with the Secondary On-Call in PagerDuty.
- Document any alerts handled during the shift in the weekly handoff notes.

---

## 5. Post-Mortem Process

Every **P1** and **P2** incident requires a blameless post-mortem document to be completed within **48 hours** of incident resolution. 

**Process:**
1. The Primary On-Call (or designated IC) duplicates the `docs/post-mortem-template.md`.
2. The team fills out the timeline, root cause, and action items.
3. A 30-minute Post-Mortem Review meeting is held with the engineering team to discuss the findings blamelessly.
4. Action items are converted into Jira tickets and prioritized in the upcoming sprint.

---

*Note: This playbook must be reviewed and approved by team leads bi-annually or after significant architectural changes.*
