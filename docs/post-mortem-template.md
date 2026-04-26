# Incident Post-Mortem: [Incident Name]

**Date of Incident:** YYYY-MM-DD
**Authors:** [Names of responders/investigators]
**Status:** [Draft / Under Review / Final]
**Severity:** [P1 / P2]

## 1. Summary
[A brief, 2-3 sentence summary of the incident, its duration, and the customer impact.]

## 2. Impact
- **Duration of Outage/Degradation:** [e.g., 1 hour 15 minutes]
- **Affected Services:** [e.g., Rewards Claiming, Frontend Dashboard]
- **Customer Impact:** [e.g., 150 users failed to claim rewards, displaying an error banner on the frontend]

## 3. Timeline (UTC)
*(List the sequence of events leading up to, during, and after the incident. Include monitoring alerts and team actions.)*
- `14:00` - Deployment of backend v1.2.3 initiated.
- `14:05` - `HighErrorRate` alert triggers in Slack.
- `14:07` - Primary On-Call acknowledges the alert.
- `14:15` - Root cause identified as a missing database migration.
- `14:20` - Rollback to v1.2.2 initiated.
- `14:25` - Systems fully recover, errors drop to 0.

## 4. Root Cause
*(Detailed technical explanation of what broke and why. Use the "5 Whys" technique if helpful.)*
- **Why did it break?** The indexer tried to write to a column that did not exist.
- **Why did it not exist?** The database migration script was not run.
- **Why wasn't it run?** The CI/CD pipeline step for migrations was accidentally disabled in a previous PR.

## 5. Resolution
*(How was the incident resolved? What steps did the team take to restore service?)*
- Rolled back the backend container image to the previous version to immediately stop the errors.

## 6. Action Items
*(Specific, actionable tasks to prevent this from happening again. Must be assigned to an owner and tracked.)*

| Action Item | Owner | Ticket ID | Status |
|---|---|---|---|
| Re-enable the database migration step in CI/CD. | Alice | ENG-101 | To Do |
| Add a pre-flight check in the backend to ensure DB schema matches expected version. | Bob | ENG-102 | To Do |
| Update operations runbook to include manual DB migration steps. | Charlie | ENG-103 | Done |

## 7. Lessons Learned
- **What went well?** The monitoring alerts fired quickly and the rollback was fast.
- **What went wrong?** The lack of automated CI/CD migrations caused human error to slip through.
- **Where did we get lucky?** The issue occurred during a low-traffic period.
