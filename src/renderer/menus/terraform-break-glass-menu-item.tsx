import { Renderer } from "@freelensapp/extensions";
import { ANNOTATIONS } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { ConfirmDialog, Icon, MenuItem, Notifications, createTerminalTab, terminalStore },
} = Renderer;

export interface TerraformBreakGlassMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformBreakGlassMenuItem = (props: TerraformBreakGlassMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    const store = Terraform.getStore<Terraform>();

    const breakGlass = () => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            const ns = object.getNs() ?? "";
            const pod = Terraform.getRunnerPodName(object);

            await store.patch(
              object,
              {
                metadata: {
                  annotations: {
                    [ANNOTATIONS.breakTheGlassRequest]: new Date().toISOString(),
                    [ANNOTATIONS.reconcileRequest]: new Date().toISOString(),
                  },
                },
              },
              "merge",
            );

            const tab = createTerminalTab({ title: `tf break-glass: ${object.getName()}` });
            const command = `kubectl exec -it -n ${ns} ${pod} -- sh`;
            await terminalStore.sendCommand(command, { tabId: tab.id, enter: true });

            Notifications.ok(
              `Break-glass requested for ${object.getName()}. Waiting for runner pod ${pod} to enter break-glass mode…`,
            );
          } catch (err) {
            Notifications.error(`Break-glass failed: ${err}`);
          }
        },
        labelOk: "Break the glass",
        message: (
          <p>
            Open an interactive shell on the runner pod for <b>{object.getName()}</b>?
            <br />
            The reconciler will pause and the pod will stay alive until the annotation is removed.
          </p>
        ),
      });
    };

    return (
      <MenuItem onClick={breakGlass}>
        <Icon material="bug_report" interactive={toolbar} title="Break glass" />
        <span className="title">Break glass</span>
      </MenuItem>
    );
  });
