import { Renderer } from "@freelensapp/extensions";
import {
  type ForceUnlockValue,
  runnerPodName,
  type StoreReadablePlan,
  TERRAFORM_API_BASE,
  TERRAFORM_API_VERSION,
  TERRAFORM_KIND,
  TERRAFORM_PLURAL,
  TERRAFORM_SHORT_NAMES,
  TERRAFORM_SINGULAR,
} from "../../../common/terraform-constants";

import type { TerraformKubeObjectCRD } from "../types";

export interface CrossNamespaceSourceReference {
  apiVersion?: string;
  kind: "GitRepository" | "OCIRepository" | "Bucket" | string;
  name: string;
  namespace?: string;
}

export interface Variable {
  name: string;
  value?: unknown;
  valueFrom?: {
    configMapKeyRef?: { name: string; key: string };
    secretKeyRef?: { name: string; key: string };
  };
}

export interface VarsReference {
  kind: "ConfigMap" | "Secret";
  name: string;
  varsKeys?: string[];
  optional?: boolean;
}

export interface WriteOutputsToSecretSpec {
  name: string;
  outputs?: string[];
}

export interface ReadInputsFromSecretSpec {
  name: string;
  as: string;
}

export interface RunnerPodMetadata {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface RunnerPodTemplate {
  metadata?: RunnerPodMetadata;
  spec?: Record<string, unknown>;
}

export interface TFStateSpec {
  forceUnlock?: ForceUnlockValue;
  lockIdentifier?: string;
}

export interface TerraformSpec {
  approvePlan?: string;
  destroy?: boolean;
  force?: boolean;
  interval: string;
  path?: string;
  planOnly?: boolean;
  disableDriftDetection?: boolean;
  breakTheGlass?: boolean;
  suspend?: boolean;
  storeReadablePlan?: StoreReadablePlan;
  sourceRef: CrossNamespaceSourceReference;
  vars?: Variable[];
  varsFrom?: VarsReference[];
  writeOutputsToSecret?: WriteOutputsToSecretSpec;
  readInputsFromSecrets?: ReadInputsFromSecretSpec[];
  runnerPodTemplate?: RunnerPodTemplate;
  tfstate?: TFStateSpec;
  serviceAccountName?: string;
  alwaysCleanupRunnerPod?: boolean;
  refreshBeforeApply?: boolean;
}

export interface TerraformCondition {
  type: string;
  status: "True" | "False" | "Unknown";
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface PlanStatus {
  lastApplied?: string;
  pending?: string;
  isDestroyPlan?: boolean;
  isDriftDetectionPlan?: boolean;
}

export interface LockStatus {
  lastApplied?: string;
  pending?: string;
}

export interface TerraformStatus {
  observedGeneration?: number;
  conditions?: TerraformCondition[];
  plan?: PlanStatus;
  lock?: LockStatus;
  lastAppliedRevision?: string;
  lastAttemptedRevision?: string;
  lastPlannedRevision?: string;
  lastPlanAt?: string;
  availableOutputs?: string[];
}

export class Terraform extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  TerraformStatus,
  TerraformSpec
> {
  static readonly kind = TERRAFORM_KIND;
  static readonly namespaced = true;
  static readonly apiBase = TERRAFORM_API_BASE;

  static readonly crd: TerraformKubeObjectCRD = {
    apiVersions: [TERRAFORM_API_VERSION],
    plural: TERRAFORM_PLURAL,
    singular: TERRAFORM_SINGULAR,
    shortNames: TERRAFORM_SHORT_NAMES,
    title: "Terraforms",
  };

  static getReadyCondition(object: Terraform): TerraformCondition | undefined {
    return object.status?.conditions?.find((c) => c.type === "Ready");
  }

  static getCondition(object: Terraform, type: string): TerraformCondition | undefined {
    return object.status?.conditions?.find((c) => c.type === type);
  }

  static isSuspended(object: Terraform): boolean {
    return object.spec.suspend === true;
  }

  static getPendingPlan(object: Terraform): string | undefined {
    return object.status?.plan?.pending;
  }

  static getPendingLock(object: Terraform): string | undefined {
    return object.status?.lock?.pending;
  }

  static isLockHeld(object: Terraform): boolean {
    const lockHeld = Terraform.getCondition(object, "StateLocked");
    return lockHeld?.status === "True" || Boolean(object.status?.lock?.pending);
  }

  static getApprovePlan(object: Terraform): string | undefined {
    return object.spec.approvePlan;
  }

  static isAutoApprove(object: Terraform): boolean {
    return object.spec.approvePlan === "auto";
  }

  static getSourceRef(object: Terraform): CrossNamespaceSourceReference {
    return object.spec.sourceRef;
  }

  static getSourceRefDisplay(object: Terraform): string {
    const src = object.spec.sourceRef;
    if (!src) return "—";
    const ns = src.namespace ?? object.getNs() ?? "";
    return `${src.kind}/${ns}/${src.name}`;
  }

  static getRunnerPodName(object: Terraform): string {
    return runnerPodName(object.getName());
  }

  static getReadyMessage(object: Terraform): string {
    const ready = Terraform.getReadyCondition(object);
    return ready?.message ?? "—";
  }

  static getReadyStatus(object: Terraform): "True" | "False" | "Unknown" | undefined {
    return Terraform.getReadyCondition(object)?.status;
  }
}

export class TerraformApi extends Renderer.K8sApi.KubeApi<Terraform> {}
export class TerraformStore extends Renderer.K8sApi.KubeObjectStore<Terraform, TerraformApi> {}
