import { Renderer } from "@freelensapp/extensions";
import { PLAN_LABELS } from "../../common/terraform-constants";

import type { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { Notifications },
  K8sApi: { configMapApi, secretsApi },
  Navigation: { showDetails },
} = Renderer;

/**
 * Open the plan ConfigMap (human mode) or Secret (json mode) for a Terraform resource
 * in Freelens's native details drawer.
 *
 * The plan is stored as a regular Kubernetes ConfigMap / Secret labeled
 * `infra.contrib.fluxcd.io/plan-name=<resource>`. Routing the user to the standard
 * details drawer gives them inline data preview, copy-to-clipboard, raw YAML view,
 * and edit — all for free.
 */
export async function showPlanInDock(object: Terraform): Promise<void> {
  const ns = object.getNs() ?? "";
  const name = object.getName();
  const mode = object.spec.storeReadablePlan ?? "none";
  const labelSelector = `${PLAN_LABELS.planName}=${name}`;

  if (mode === "none") {
    Notifications.info(`${name}: spec.storeReadablePlan is unset. Set it to 'human' or 'json' to view plans.`);
    return;
  }

  try {
    const items =
      mode === "json"
        ? ((await secretsApi.list({ namespace: ns }, { labelSelector })) ?? [])
        : ((await configMapApi.list({ namespace: ns }, { labelSelector })) ?? []);

    if (items.length === 0) {
      Notifications.info(
        `${name}: no plan ${mode === "json" ? "Secret" : "ConfigMap"} found yet. ` + `Trigger a plan and try again.`,
      );
      return;
    }

    // Multi-chunk plans split into several ConfigMaps; sort by chunk annotation and open the first.
    const ordered = [...items].sort((a, b) => {
      const ai = Number(a.metadata.annotations?.["infra.contrib.fluxcd.io/plan-chunk"] ?? "0");
      const bi = Number(b.metadata.annotations?.["infra.contrib.fluxcd.io/plan-chunk"] ?? "0");
      return ai - bi;
    });

    showDetails(ordered[0].selfLink);

    if (ordered.length > 1) {
      Notifications.info(
        `${name}: plan is chunked across ${ordered.length} ${mode === "json" ? "Secrets" : "ConfigMaps"} (filter by ${labelSelector} to see all).`,
      );
    }
  } catch (err) {
    Notifications.error(`Failed to load plan for ${name}: ${err}`);
  }
}
