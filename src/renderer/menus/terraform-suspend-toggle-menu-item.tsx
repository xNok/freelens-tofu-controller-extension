import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface TerraformSuspendToggleMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformSuspendToggleMenuItem = (props: TerraformSuspendToggleMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();

    const set = async (suspend: boolean) => {
      try {
        await store.patch(object, { spec: { suspend } }, "merge");
        Notifications.ok(`${object.getName()} ${suspend ? "suspended" : "resumed"}`);
      } catch (err) {
        Notifications.error(`${suspend ? "Suspend" : "Resume"} failed: ${err}`);
      }
    };

    if (Terraform.isSuspended(object)) {
      return (
        <MenuItem onClick={() => set(false)}>
          <Icon material="play_circle_outline" interactive={toolbar} title="Resume" />
          <span className="title">Resume</span>
        </MenuItem>
      );
    }
    return (
      <MenuItem onClick={() => set(true)}>
        <Icon material="pause_circle_filled" interactive={toolbar} title="Suspend" />
        <span className="title">Suspend</span>
      </MenuItem>
    );
  });
