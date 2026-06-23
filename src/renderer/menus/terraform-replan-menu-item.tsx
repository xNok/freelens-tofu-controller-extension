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
    const name = object.getName();
    const ns = object.getNs() ?? "";
    const tfctlCommand = ns ? `tfctl replan ${name} -n ${ns}` : `tfctl replan ${name}`;

    const copyTfctlCommand = async () => {
      try {
        await navigator.clipboard.writeText(tfctlCommand);
        Notifications.ok("tfctl command copied to clipboard");
      } catch (err) {
        Notifications.error(`Copy failed: ${err}`);
      }
    };

    const replan = () => {
      ConfirmDialog.open({
        ok: async () => {
          try {
            // Mirror tfctl: PATCH /status to clear plan.pending, then PATCH the main
            // resource to request a reconcile. If status PATCH is rejected (typically
            // RBAC on the `terraforms/status` subresource), fall back to the spec-only
            // path so users without that permission still get a best-effort replan.
            let statusCleared = true;
            try {
              await store.api.patchStatus({ name, namespace: ns }, { plan: { pending: "" } });
            } catch (statusErr) {
              statusCleared = false;
              console.warn(`[replan] status patch failed, falling back to spec-only path:`, statusErr);
            }

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

            if (statusCleared) {
              Notifications.ok(`Replan requested for ${name}`);
            } else {
              Notifications.info(
                `Reconciliation requested for ${name} (status patch blocked — likely RBAC on terraforms/status). Run the tfctl command for a clean replan.`,
              );
            }
          } catch (err) {
            Notifications.error(`Replan failed: ${err}`);
          }
        },
        labelOk: "Replan",
        message: (
          <div style={{ minWidth: "32rem", maxWidth: "44rem" }}>
            <p>
              Request the controller to regenerate the plan for <b>{name}</b>?
            </p>
            <p style={{ marginTop: "0.75em", opacity: 0.75, fontSize: "0.9em" }}>
              The extension patches <code>/status</code> to clear <code>plan.pending</code> and patches the main spec to
              request a reconcile — the same operations <code>tfctl replan</code> performs. If the status patch is
              denied by RBAC, the extension falls back to a spec-only reconcile; in that case run the equivalent command
              instead:
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: "0.5em",
                marginTop: "0.5em",
              }}
            >
              <code
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "0.4em 0.6em",
                  background: "var(--colorVague, #2a2a2a)",
                  borderRadius: "3px",
                  fontFamily: "var(--font-monospace, monospace)",
                  fontSize: "0.85em",
                  userSelect: "all",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {tfctlCommand}
              </code>
              <button
                type="button"
                onClick={copyTfctlCommand}
                style={{
                  padding: "0.4em 0.9em",
                  cursor: "pointer",
                  border: "1px solid var(--borderFaintColor, #555)",
                  background: "transparent",
                  color: "inherit",
                  borderRadius: "3px",
                  flexShrink: 0,
                }}
              >
                Copy
              </button>
            </div>
          </div>
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
