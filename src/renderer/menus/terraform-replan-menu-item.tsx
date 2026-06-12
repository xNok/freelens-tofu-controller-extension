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
            const now = new Date().toISOString();
            await store.patch(
              object,
              {
                metadata: {
                  annotations: {
                    [ANNOTATIONS.replanRequest]: now,
                    [ANNOTATIONS.reconcileRequest]: now,
                  },
                },
                spec: {
                  approvePlan: "",
                },
              },
              "merge",
            );
            Notifications.ok(`Replan requested for ${object.getName()}`);
          } catch (err) {
            Notifications.error(`Replan failed: ${err}`);
          }
        },
        labelOk: "Replan",
        message: (
          <p>
            Force a fresh plan for <b>{object.getName()}</b>? Any pending plan will be discarded.
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
