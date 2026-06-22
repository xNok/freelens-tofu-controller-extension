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
            Notifications.ok(`Reconciliation requested for ${name}`);
          } catch (err) {
            Notifications.error(`Replan failed: ${err}`);
          }
        },
        labelOk: "Replan",
        message: (
          <>
            <p>
              Request the controller to regenerate the plan for <b>{name}</b>?
            </p>
            <p>
              <small>
                Note: this is a best-effort replan via reconcile — Freelens extensions cannot patch the status
                subresource that tfctl uses, so a stale pending plan may persist briefly until the next loop. For a true
                replan, run the equivalent tfctl command instead:
              </small>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em", marginTop: "0.25em" }}>
              <code
                style={{
                  flex: 1,
                  padding: "0.35em 0.6em",
                  background: "var(--colorVague, #2a2a2a)",
                  borderRadius: "3px",
                  fontFamily: "var(--font-monospace, monospace)",
                  userSelect: "all",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {tfctlCommand}
              </code>
              <button
                type="button"
                onClick={copyTfctlCommand}
                style={{
                  padding: "0.35em 0.75em",
                  cursor: "pointer",
                  border: "1px solid var(--borderFaintColor, #555)",
                  background: "transparent",
                  color: "inherit",
                  borderRadius: "3px",
                }}
              >
                Copy
              </button>
            </div>
          </>
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
