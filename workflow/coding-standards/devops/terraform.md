# Terraform Coding Standards

Reference for generating `ai/coding-standards/devops.md` in projects using Terraform.

## Version Pinning

- Pin Terraform and every provider to patch-level: `~> X.Y.Z` (not `~> X.Y`). Two-segment form permits unintended minor bumps.
- Commit `.terraform.lock.hcl` — pins provider checksums across platforms and CI.

## Remote State

- Never store state in git — state files contain secrets in plaintext.
- Use remote state with locking (S3+DynamoDB, GCS, Terraform Cloud) from the first commit.
- One state file per environment and service. Never share state across environments.

## Secrets

- `sensitive = true` on any variable/output with credentials. Suppresses terminal output but secrets are **still in state plaintext** — treat state as secret.
- Pass secrets via `TF_VAR_*` environment variables, never in committed `.tfvars`.
- Pull runtime secrets from a secrets manager: `data "aws_secretsmanager_secret_version"`.
- Add `*.tfvars` to `.gitignore`. Provide `terraform.tfvars.example` with placeholders.

## Module Structure

```
modules/{name}/main.tf, variables.tf, outputs.tf, versions.tf
environments/{env}/main.tf, variables.tf, terraform.tfvars (gitignored)
```

- Never mix inputs/outputs/providers into `main.tf`. Validate variables where the contract matters.

## Safety

- `prevent_destroy = true` on databases, S3 buckets with live data, KMS keys.
- `create_before_destroy = true` for resources that can't have downtime.
- Save and review plans: `terraform plan -out=tfplan && terraform show tfplan && terraform apply tfplan`.
- Never `terraform apply -auto-approve` in CI — use saved plan files.
- Never `terraform destroy` in production without a second reviewer.
- Use `-target` only for emergency break-glass. Targeted applies create state drift.

## IAM

- One IAM role per service. Never share roles across trust levels.
- Narrow resource ARNs and specific actions — never `Action: ["*"]` or `Resource: ["*"]`.
- Run `checkov` or `tfsec` in CI to catch overly permissive policies.

## Common Footguns

- **`-auto-approve` in CI**: bypasses plan review
- **`prevent_destroy = false` on databases**: typo or module rename triggers drop-and-recreate
- **`sensitive = false` on secret outputs**: appear in `terraform output` and CI logs
- **Unlocked `.terraform.lock.hcl`**: different machines resolve different provider versions
- **`-target` in routine applies**: leaves state inconsistent, causes silent drift
- **Broad provider credentials**: if `AWS_ACCESS_KEY_ID` has `*/*`, a leak exposes full account
