# DevOps / IaC Stack Detection

Agents: read this file to identify infrastructure tooling in the project, then load the matching file as a reference when generating `ai/instructions/devops.md`.

**Boundary with backend.md and conventions.md:** devops.md covers infrastructure-as-code conventions, image-build pipelines, and deployment tooling. Application-level patterns (service layers, ORM, error handling) belong in backend.md.

## Detection Signals

| Signal | Stack file |
|--------|-----------|
| `*.tf` files or `terraform/` directory | terraform.md |
| `*.pkr.hcl` files or `packer/` directory | No dedicated template - generate conventions from observed patterns |

Also note adjacent infrastructure signals even if there is not yet a
dedicated stack file in this folder:
- `Dockerfile`, `docker-compose.yml`, `compose.yaml`
- `helm/`, `Chart.yaml`, `values.yaml`
- `kustomization.yaml`, `manifests/`, raw Kubernetes YAML
- `ansible/`, `playbooks/`, `roles/`
- `.github/workflows/`, `deploy/`, `scripts/release*`
- Pulumi entrypoints such as `Pulumi.yaml`

Unsupported tooling is still part of the real deployment surface. If the
library has no dedicated reference for it yet, mention the tool explicitly
in the generated `devops.md` instead of pretending the repo is Terraform-
or Packer-only.

## Multiple IaC tools

Projects often combine Terraform (infrastructure) with Packer (base images),
Docker (runtime packaging), CI workflows (delivery), and configuration tools.
Generate separate sections per tool or one unified `devops.md` with clear
tool boundaries.

## Selection Rules

- Load every dedicated reference that matches the detected tooling.
- If multiple tools overlap, keep responsibilities explicit:
  - Terraform/Pulumi: provision infrastructure
  - Packer: build machine images
  - Docker/Compose: package and run services
  - CI/CD workflows: build, validate, release, deploy
  - Kubernetes/Helm/Kustomize: runtime orchestration
- Do not let infrastructure guidance overwrite application coding rules.
- If the repo has deployment scripts but no formal IaC, still document the
  deployment path, secrets handling expectations, and verification steps.
