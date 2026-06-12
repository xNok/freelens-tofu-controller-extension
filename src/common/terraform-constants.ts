/**
 * Constants mirroring the tofu-controller's contract.
 *
 * Sources:
 * - github.com/flux-iac/tofu-controller/api/v1alpha2/terraform_types.go
 * - github.com/flux-iac/tofu-controller/tfctl/tfctl.go
 */

export const TERRAFORM_GROUP = "infra.contrib.fluxcd.io";
export const TERRAFORM_VERSION = "v1alpha2";
export const TERRAFORM_API_VERSION = `${TERRAFORM_GROUP}/${TERRAFORM_VERSION}` as const;
export const TERRAFORM_API_BASE = `/apis/${TERRAFORM_API_VERSION}/terraforms` as const;

export const TERRAFORM_KIND = "Terraform";
export const TERRAFORM_PLURAL = "terraforms";
export const TERRAFORM_SINGULAR = "terraform";
export const TERRAFORM_SHORT_NAMES = ["tf"];

export const CONTROLLER_DEFAULT_NAMESPACE = "flux-system";

// Deployments shipped by either the raw release manifest (`tf-controller`) or the Helm chart (`tofu-controller`).
export const CONTROLLER_DEPLOYMENT_CANDIDATES = ["tofu-controller", "tf-controller"] as const;

// Containers (any container in any pod in the controller namespace) whose image matches this regex
// is treated as the controller. Survives renames / forks.
export const CONTROLLER_IMAGE_PATTERN = /(tofu|tf)-controller/i;

export const ANNOTATIONS = {
  reconcileRequest: "reconcile.fluxcd.io/requestedAt",
  breakTheGlassRequest: "break-the-glass.tf-controller/requestedAt",
  replanRequest: "replan.tf-controller/requestedAt",
} as const;

export const PLAN_LABELS = {
  planName: `${TERRAFORM_GROUP}/plan-name`,
  workspace: `${TERRAFORM_GROUP}/plan-workspace`,
} as const;

export const PLAN_ANNOTATIONS = {
  chunkIndex: `${TERRAFORM_GROUP}/plan-chunk`,
  hash: `${TERRAFORM_GROUP}/plan-hash`,
  savedPlan: "savedPlan",
} as const;

export type ForceUnlockValue = "auto" | "yes" | "no";

export type StoreReadablePlan = "none" | "json" | "human";

export function runnerPodName(terraformName: string): string {
  return `${terraformName}-tf-runner`;
}

export const RELEASE_MANIFEST_URL =
  "https://github.com/flux-iac/tofu-controller/releases/latest/download/tf-controller.deploy.yaml";

export const INSTALL_DOCS_URL = "https://flux-iac.github.io/tofu-controller/getting_started/";
