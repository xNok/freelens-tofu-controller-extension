import { Renderer } from "@freelensapp/extensions";
import { ANNOTATIONS } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { ConfirmDialog, Icon, MenuItem, Notifications },
} = Renderer;

export interface TerraformForceUnlockMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformForceUnlockMenuItem = (props: TerraformForceUnlockMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();
    const lockId = Terraform.getPendingLock(object);

    const unlock = () => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            await store.patch(
              object,
              {
                metadata: {
                  annotations: {
                    [ANNOTATIONS.reconcileRequest]: new Date().toISOString(),
                  },
                },
                spec: {
                  tfstate: {
                    forceUnlock: "yes",
                    ...(lockId ? { lockIdentifier: lockId } : {}),
                  },
                },
              },
              "merge",
            );
            Notifications.ok(`Force unlock requested for ${object.getName()}`);
          } catch (err) {
            Notifications.error(`Force unlock failed: ${err}`);
          }
        },
        labelOk: "Force unlock",
        message: (
          <p>
            Force-unlock the Terraform state for <b>{object.getName()}</b>?
            {lockId ? (
              <>
                {" "}
                Pending lock ID: <code>{lockId}</code>.
              </>
            ) : null}{" "}
            This is potentially destructive — only run it if you are certain no other apply is in flight.
          </p>
        ),
      });
    };

    return (
      <MenuItem onClick={unlock}>
        <Icon material="lock_open" interactive={toolbar} title="Force unlock" />
        <span className="title">Force unlock</span>
      </MenuItem>
    );
  });
