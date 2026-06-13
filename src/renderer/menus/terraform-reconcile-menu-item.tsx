import { Renderer } from "@freelensapp/extensions";
import { ANNOTATIONS } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface TerraformReconcileMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformReconcileMenuItem = (props: TerraformReconcileMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();

    const reconcile = async () => {
      try {
        await store.patch(
          object,
          {
            metadata: {
              annotations: {
                [ANNOTATIONS.reconcileRequest]: new Date().toISOString(),
              },
            },
          },
          "merge",
        );
        Notifications.ok(`Reconciliation requested for ${object.getName()}`);
      } catch (err) {
        Notifications.error(`Reconcile failed: ${err}`);
      }
    };

    return (
      <MenuItem onClick={reconcile}>
        <Icon material="refresh" interactive={toolbar} title="Reconcile" />
        <span className="title">Reconcile</span>
      </MenuItem>
    );
  });
