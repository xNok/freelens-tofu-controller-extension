import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { ConfirmDialog, Icon, MenuItem, Notifications },
} = Renderer;

export interface TerraformApprovePlanMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformApprovePlanMenuItem = (props: TerraformApprovePlanMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();
    const pending = Terraform.getPendingPlan(object);

    const approve = (planId: string) => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            await store.patch(object, { spec: { approvePlan: planId } }, "merge");
            Notifications.ok(
              planId === "auto"
                ? `Auto-approval enabled for ${object.getName()}`
                : `Approved plan ${planId} for ${object.getName()}`,
            );
          } catch (err) {
            Notifications.error(`Approval failed: ${err}`);
          }
        },
        labelOk: "Approve",
        message: (
          <p>
            {planId === "auto" ? (
              <>
                Enable <b>auto-approval</b> for <b>{object.getName()}</b>? All future plans will be applied without
                confirmation.
              </>
            ) : (
              <>
                Approve plan <b>{planId}</b> for <b>{object.getName()}</b>?
              </>
            )}
          </p>
        ),
      });
    };

    return (
      <>
        <MenuItem
          onClick={() => {
            if (pending) approve(pending);
          }}
          disabled={!pending}
        >
          <Icon material="check_circle" interactive={toolbar} title="Approve plan" />
          <span className="title">Approve plan</span>
        </MenuItem>
        <MenuItem onClick={() => approve("auto")}>
          <Icon material="all_inclusive" interactive={toolbar} title="Auto-approve all plans" />
          <span className="title">Auto-approve</span>
        </MenuItem>
      </>
    );
  });
