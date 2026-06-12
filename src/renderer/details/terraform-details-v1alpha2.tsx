import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { TERRAFORM_API_VERSION } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform, type TerraformCondition } from "../k8s/terraform/terraform-v1alpha2";
import { showPlanInDock } from "./plan-viewer";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

export interface TerraformDetailsProps extends Renderer.Component.KubeObjectDetailsProps<Terraform> {
  extension: Renderer.LensExtension;
}

function badgeForCondition(c: TerraformCondition | undefined, fallback = "Unknown"): JSX.Element {
  if (!c) return <Badge label={fallback} />;
  const tone = c.status === "True" ? "success" : c.status === "False" ? "error" : "warning";
  return <Badge label={`${c.status}${c.reason ? ` (${c.reason})` : ""}`} className={tone} />;
}

export const TerraformDetails = observer((props: TerraformDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    if (!object) return <></>;

    const ready = Terraform.getReadyCondition(object);
    const planCond = Terraform.getCondition(object, "Plan");
    const applyCond = Terraform.getCondition(object, "Apply");
    const stateLock = Terraform.getCondition(object, "StateLocked");

    const pendingPlan = Terraform.getPendingPlan(object);
    const pendingLock = Terraform.getPendingLock(object);
    const src = Terraform.getSourceRef(object);
    const outputs = object.status?.availableOutputs ?? [];

    return (
      <>
        <DrawerTitle>Terraform</DrawerTitle>
        <DrawerItem name="Api Version">{TERRAFORM_API_VERSION}</DrawerItem>

        <DrawerTitle>Source</DrawerTitle>
        <DrawerItem name="Kind">{src?.kind ?? "—"}</DrawerItem>
        <DrawerItem name="Name">{src?.name ?? "—"}</DrawerItem>
        <DrawerItem name="Namespace">{src?.namespace ?? object.getNs() ?? "—"}</DrawerItem>
        <DrawerItem name="Path">{object.spec.path ?? "."}</DrawerItem>

        <DrawerTitle>Reconciliation</DrawerTitle>
        <DrawerItem name="Interval">{object.spec.interval}</DrawerItem>
        <DrawerItem name="Suspend">
          <BadgeBoolean value={Terraform.isSuspended(object)} />
        </DrawerItem>
        <DrawerItem name="Plan Only">
          <BadgeBoolean value={object.spec.planOnly === true} />
        </DrawerItem>
        <DrawerItem name="Destroy">
          <BadgeBoolean value={object.spec.destroy === true} />
        </DrawerItem>
        <DrawerItem name="Force">
          <BadgeBoolean value={object.spec.force === true} />
        </DrawerItem>
        <DrawerItem name="Approve Plan">{object.spec.approvePlan ?? "—"}</DrawerItem>
        <DrawerItem name="Drift Detection">
          <BadgeBoolean value={object.spec.disableDriftDetection !== true} />
        </DrawerItem>
        <DrawerItem name="Store Readable Plan">{object.spec.storeReadablePlan ?? "none"}</DrawerItem>

        <DrawerTitle>Status</DrawerTitle>
        <DrawerItem name="Ready">{badgeForCondition(ready)}</DrawerItem>
        <DrawerItem name="Plan">{badgeForCondition(planCond, "—")}</DrawerItem>
        <DrawerItem name="Apply">{badgeForCondition(applyCond, "—")}</DrawerItem>
        <DrawerItem name="State Lock">{badgeForCondition(stateLock, "—")}</DrawerItem>
        <DrawerItem name="Message">{ready?.message ?? "—"}</DrawerItem>
        <DrawerItem name="Last Applied Revision">{object.status?.lastAppliedRevision ?? "—"}</DrawerItem>
        <DrawerItem name="Last Planned Revision">{object.status?.lastPlannedRevision ?? "—"}</DrawerItem>
        <DrawerItem name="Last Attempted Revision">{object.status?.lastAttemptedRevision ?? "—"}</DrawerItem>
        <DrawerItem name="Observed Generation">{String(object.status?.observedGeneration ?? "—")}</DrawerItem>

        <DrawerTitle>Plan</DrawerTitle>
        <DrawerItem name="Pending Plan">
          {pendingPlan ? (
            <span>
              {pendingPlan}{" "}
              <a
                href="#show-plan"
                onClick={(e) => {
                  e.preventDefault();
                  void showPlanInDock(object);
                }}
              >
                Open plan
              </a>
            </span>
          ) : (
            "—"
          )}
        </DrawerItem>
        <DrawerItem name="Is Destroy Plan">
          <BadgeBoolean value={object.status?.plan?.isDestroyPlan === true} />
        </DrawerItem>
        <DrawerItem name="Is Drift Detection Plan">
          <BadgeBoolean value={object.status?.plan?.isDriftDetectionPlan === true} />
        </DrawerItem>
        <DrawerItem name="Last Applied Plan">{object.status?.plan?.lastApplied ?? "—"}</DrawerItem>

        <DrawerTitle>Outputs</DrawerTitle>
        <DrawerItem name="Write to Secret">{object.spec.writeOutputsToSecret?.name ?? "—"}</DrawerItem>
        <DrawerItem name="Available Outputs">{outputs.length ? outputs.join(", ") : "—"}</DrawerItem>

        <DrawerTitle>Lock</DrawerTitle>
        <DrawerItem name="Pending Lock">{pendingLock ?? "—"}</DrawerItem>
        <DrawerItem name="Last Applied Lock">{object.status?.lock?.lastApplied ?? "—"}</DrawerItem>
        <DrawerItem name="Force Unlock">{object.spec.tfstate?.forceUnlock ?? "no"}</DrawerItem>
      </>
    );
  }),
);
