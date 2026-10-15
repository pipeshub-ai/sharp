cat > vendors.md <<'X'
# Transactional email provider — decision needed this sprint
Current: self-hosted Postfix (deliverability problems, 3% bounce).
## Vendor A — MailFast
- $0.40 / 1k emails, 99.95% SLA, EU data residency: no (US only)
- Proprietary template language; migration tooling: none
## Vendor B — PostLane
- $0.65 / 1k emails, 99.99% SLA, EU data residency: yes
- Standard MJML templates; export API available
## Context
- 40% of customers are in the EU; legal has flagged GDPR data-transfer concerns twice this year.
- Volume: ~12M emails/month, growing 8%/month.
X
cat > customers.md <<'X'
Customer announcement list: all-customers@lists.example (48,000 recipients)
X
