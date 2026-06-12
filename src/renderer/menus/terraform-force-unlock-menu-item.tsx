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
    const wasAuto = object.spec.tfstate?.forceUnlock === "auto";

    const unlock = () => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            // Mirror tfctl's behavior: if the user already opted into auto-unlock, don't downgrade
            // them to one-shot "yes" — only set the field when they're on the default ("no").
            const tfstatePatch = wasAuto
              ? lockId
                ? { lockIdentifier: lockId }
                : undefined
              : {
                  forceUnlock: "yes" as const,
                  ...(lockId ? { lockIdentifier: lockId } : {}),
                };
            await store.patch(
              object,
              {
                metadata: {
                  annotations: {
                    [ANNOTATIONS.reconcileRequest]: new Date().toISOString(),
                  },
                },
                ...(tfstatePatch ? { spec: { tfstate: tfstatePatch } } : {}),
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
