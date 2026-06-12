import { Renderer } from "@freelensapp/extensions";
import { ANNOTATIONS } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { ConfirmDialog, Icon, MenuItem, Notifications },
} = Renderer;

export interface TerraformReplanMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformReplanMenuItem = (props: TerraformReplanMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();

    const replan = () => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            // tfctl's `replan` patches the status subresource to clear plan.pending and
            // sets a `ReplanRequested` Ready reason. The Freelens extension API does not
            // expose status patches, so we fall back to clearing spec.approvePlan and
            // requesting a reconcile — the controller will produce a fresh plan on the
            // next loop. This is best-effort, not a true replan.
            await store.patch(
              object,
              {
                metadata: {
                  annotations: {
                    [ANNOTATIONS.reconcileRequest]: new Date().toISOString(),
                  },
                },
                spec: {
                  approvePlan: "",
                },
              },
              "merge",
            );
            Notifications.ok(`Reconciliation requested for ${object.getName()}`);
          } catch (err) {
            Notifications.error(`Replan failed: ${err}`);
          }
        },
        labelOk: "Replan",
        message: (
          <p>
            Request the controller to regenerate the plan for <b>{object.getName()}</b>?
            <br />
            <small>
              Note: this is a best-effort replan via reconcile — Freelens extensions cannot patch the status subresource
              that tfctl uses, so a stale pending plan may persist briefly until the next loop.
            </small>
          </p>
        ),
      });
    };

    return (
      <MenuItem onClick={replan}>
        <Icon material="restart_alt" interactive={toolbar} title="Replan" />
        <span className="title">Replan</span>
      </MenuItem>
    );
  });
