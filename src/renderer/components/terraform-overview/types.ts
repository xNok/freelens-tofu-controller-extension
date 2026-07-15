import { Terraform } from "../../k8s/terraform/terraform-v1alpha2";

export interface Buckets {
  total: number;
  ready: number;
  notReady: number;
  inProgress: number;
  suspended: number;
  unknown: number;
  pendingPlans: Terraform[];
  failedItems: Terraform[];
  lockedItems: Terraform[];
}
