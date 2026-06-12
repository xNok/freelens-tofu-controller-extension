import { Renderer } from "@freelensapp/extensions";
import { PLAN_ANNOTATIONS, PLAN_LABELS } from "../../common/terraform-constants";

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
 * Upstream tofu-controller labels plan resources with two keys (see
 * `runner/server_save_tfplan.go`): `infra.contrib.fluxcd.io/plan-name` (the resource
 * name; suffixed with `.json` in json mode) and `infra.contrib.fluxcd.io/plan-workspace`.
 * Label values are run through Kubernetes label-safe normalization (63 chars + sha
 * suffix for longer names) before being applied, so naive equality matching breaks for
 * very long names. We default to the unsafe-but-readable form and the controller's
 * default workspace ("default") when the spec doesn't override it.
 */
export async function showPlanInDock(object: Terraform): Promise<void> {
  const ns = object.getNs() ?? "";
  const name = object.getName();
  const mode = object.spec.storeReadablePlan ?? "none";
  const workspace = object.spec.workspace ?? "default";

  if (mode === "none") {
    Notifications.info(`${name}: spec.storeReadablePlan is unset. Set it to 'human' or 'json' to view plans.`);
    return;
  }

  // JSON-mode plans are stored under `<name>.json` so the same label key can disambiguate
  // human vs json artifacts on the same resource.
  const planName = mode === "json" ? `${name}.json` : name;
  const labelSelector = `${PLAN_LABELS.planName}=${planName},${PLAN_LABELS.workspace}=${workspace}`;

  try {
    const items =
      mode === "json"
        ? ((await secretsApi.list({ namespace: ns }, { labelSelector })) ?? [])
        : ((await configMapApi.list({ namespace: ns }, { labelSelector })) ?? []);

    if (items.length === 0) {
      Notifications.info(
        `${name}: no plan ${mode === "json" ? "Secret" : "ConfigMap"} found yet. Trigger a plan and try again.`,
      );
      return;
    }

    // Multi-chunk plans split into several resources; sort by chunk annotation and open the first.
    const ordered = [...items].sort((a, b) => {
      const ai = Number(a.metadata.annotations?.[PLAN_ANNOTATIONS.chunkIndex] ?? "0");
      const bi = Number(b.metadata.annotations?.[PLAN_ANNOTATIONS.chunkIndex] ?? "0");
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
