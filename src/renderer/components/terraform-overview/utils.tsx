import { Renderer } from "@freelensapp/extensions";
import { Terraform } from "../../k8s/terraform/terraform-v1alpha2";

const {
  Component: { Badge },
} = Renderer;

export function readyBadge(t: Terraform) {
  const status = Terraform.getReadyStatus(t);
  if (status === "True") return <Badge label="Ready" className="success" />;
  if (status === "False") return <Badge label="Failed" className="error" />;
  return <Badge label="Unknown" className="warning" />;
}
