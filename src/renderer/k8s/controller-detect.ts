import { Renderer } from "@freelensapp/extensions";
import {
  CONTROLLER_DEPLOYMENT_CANDIDATES,
  CONTROLLER_IMAGE_PATTERN,
  TERRAFORM_GROUP,
  TERRAFORM_PLURAL,
} from "../../common/terraform-constants";

const {
  K8sApi: { crdApi, deploymentApi },
} = Renderer;

export interface ControllerStatus {
  crdInstalled: boolean;
  controllerDeployed: boolean;
  controllerReady: boolean;
  controllerImage?: string;
  controllerDeploymentName?: string;
  /** Last error encountered while detecting, if any (e.g. RBAC forbidden). */
  error?: string;
}

function isForbidden(err: unknown): boolean {
  const msg = String(err ?? "").toLowerCase();
  return msg.includes("forbidden") || msg.includes("unauthorized") || msg.includes("status code 403");
}

const crdName = `${TERRAFORM_PLURAL}.${TERRAFORM_GROUP}`;

export async function detectController(controllerNamespace: string): Promise<ControllerStatus> {
  const status: ControllerStatus = {
    crdInstalled: false,
    controllerDeployed: false,
    controllerReady: false,
  };

  try {
    const crd = await crdApi.get({ name: crdName });
    status.crdInstalled = Boolean(crd);
  } catch (err) {
    if (isForbidden(err)) status.error = `Cannot read CRDs: ${err}`;
    status.crdInstalled = false;
  }

  // 1) Look up by known deployment names first (fast path).
  for (const candidate of CONTROLLER_DEPLOYMENT_CANDIDATES) {
    try {
      const dep = await deploymentApi.get({ name: candidate, namespace: controllerNamespace });
      if (dep) {
        recordDeployment(status, dep, candidate);
        return status;
      }
    } catch (err) {
      if (isForbidden(err)) {
        status.error = `Cannot read deployments in ${controllerNamespace}: ${err}`;
        return status;
      }
      // 404s and other non-permission errors: try the next candidate.
    }
  }

  // 2) Fallback: scan all deployments in the namespace for one whose container image matches the controller.
  try {
    const all = (await deploymentApi.list({ namespace: controllerNamespace })) ?? [];
    for (const dep of all) {
      const image = dep.spec?.template?.spec?.containers?.find(
        (c) => typeof c.image === "string" && CONTROLLER_IMAGE_PATTERN.test(c.image),
      )?.image;
      if (image) {
        recordDeployment(status, dep, dep.getName());
        return status;
      }
    }
  } catch (err) {
    if (isForbidden(err)) status.error = `Cannot list deployments in ${controllerNamespace}: ${err}`;
  }

  return status;
}

function recordDeployment(status: ControllerStatus, dep: { spec?: any; status?: any }, name: string): void {
  status.controllerDeployed = true;
  status.controllerDeploymentName = name;
  const image = dep.spec?.template?.spec?.containers?.[0]?.image;
  status.controllerImage = typeof image === "string" ? image : undefined;
  const ready = dep.status?.readyReplicas ?? 0;
  const desired = dep.status?.replicas ?? 0;
  status.controllerReady = ready > 0 && ready === desired;
}
