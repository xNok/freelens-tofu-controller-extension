import { Common, Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TerraformPreferencesStore } from "../../common/store";
import { TERRAFORM_GROUP, TERRAFORM_KIND } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { ControllerStatusBox } from "../components/terraform-overview/controller-status-box";
import { FailedResourcesTable } from "../components/terraform-overview/failed-resources-table";
import { NotInstalledBox } from "../components/terraform-overview/not-installed-box";
import { PendingPlansTable } from "../components/terraform-overview/pending-plans-table";
import { RecentEventsTable } from "../components/terraform-overview/recent-events-table";
import { SummaryCharts } from "../components/terraform-overview/summary-charts";
import { type ControllerStatus, detectController } from "../k8s/controller-detect";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";
import styles from "./terraform-overview.module.scss";
import stylesInline from "./terraform-overview.module.scss?inline";

import type { Buckets } from "../components/terraform-overview/types";

const { observer } = MobxReact;
const {
  Component: { Button, NamespaceSelectFilter, Spinner, TabLayout },
  K8sApi: { eventStore },
  Navigation: { navigate },
} = Renderer;

export interface TerraformOverviewPageProps {
  extension: Renderer.LensExtension;
}

function bucket(items: Terraform[]): Buckets {
  const b: Buckets = {
    total: items.length,
    ready: 0,
    notReady: 0,
    inProgress: 0,
    suspended: 0,
    unknown: 0,
    pendingPlans: [],
    failedItems: [],
    lockedItems: [],
  };
  for (const t of items) {
    const ready = Terraform.getReadyCondition(t);
    if (Terraform.isSuspended(t)) {
      b.suspended += 1;
    } else if (!ready) {
      b.unknown += 1;
    } else if (ready.status === "True") {
      b.ready += 1;
    } else if (ready.status === "False") {
      b.notReady += 1;
      b.failedItems.push(t);
    } else {
      b.inProgress += 1;
    }
    if (Terraform.getPendingPlan(t)) b.pendingPlans.push(t);
    if (Terraform.isLockHeld(t)) b.lockedItems.push(t);
  }
  return b;
}

export const TerraformOverviewPage = observer((props: TerraformOverviewPageProps) =>
  withErrorPage(props, () => {
    const preferences = TerraformPreferencesStore.getInstanceOrCreate<TerraformPreferencesStore>();
    const [status, setStatus] = useState<ControllerStatus | undefined>(undefined);
    const [detecting, setDetecting] = useState(true);

    // Tracks whether the component is still mounted across awaits so we don't
    // setState() on an unmounted component or after a namespace switch.
    const aliveRef = useRef(true);

    const refresh = useCallback(async () => {
      if (!aliveRef.current) return;
      setDetecting(true);
      const s = await detectController(preferences.controllerNamespace);
      if (!aliveRef.current) return;
      setStatus(s);
      if (s.crdInstalled) {
        try {
          await Terraform.getStore<Terraform>().loadAll();
        } catch (err) {
          Common.logger.warn(`[${props.extension.name}] terraform store load: ${err}`);
        }
        try {
          await eventStore.loadAll();
        } catch (err) {
          Common.logger.warn(`[${props.extension.name}] event store load: ${err}`);
        }
      }
      if (aliveRef.current) setDetecting(false);
    }, [preferences.controllerNamespace, props.extension.name]);

    useEffect(() => {
      aliveRef.current = true;
      void refresh();
      const id = setInterval(() => void refresh(), 30_000);
      return () => {
        aliveRef.current = false;
        clearInterval(id);
      };
    }, [refresh]);

    let items: Terraform[] = [];
    try {
      items = Terraform.getStore<Terraform>().contextItems;
    } catch {
      items = [];
    }
    const b = bucket(items);

    // Recent Terraform events from the global event store, narrowed by group/kind.
    const events = (() => {
      try {
        return eventStore.contextItems
          .filter(
            (e) =>
              (e.involvedObject?.apiVersion ?? "").startsWith(`${TERRAFORM_GROUP}/`) ||
              e.involvedObject?.kind === TERRAFORM_KIND,
          )
          .sort((a, b) => {
            const ta = new Date(a.lastTimestamp ?? a.metadata.creationTimestamp ?? 0).getTime();
            const tb = new Date(b.lastTimestamp ?? b.metadata.creationTimestamp ?? 0).getTime();
            return tb - ta;
          })
          .slice(0, 25);
      } catch {
        return [];
      }
    })();

    const terraformsUrl = `/extension/${props.extension.sanitizedExtensionId}/tofu-terraforms`;

    const renderInstalled = () => (
      <>
        <ControllerStatusBox status={status} namespace={preferences.controllerNamespace} />

        <SummaryCharts bucket={b} terraformsUrl={terraformsUrl} crdTitle={Terraform.crd.title} />

        <div className={styles.actions} style={{ marginTop: "1rem" }}>
          <Button label="Open Terraforms" primary onClick={() => navigate(terraformsUrl)} />
          <Button
            label="New Terraform"
            onClick={() => navigate(`/extension/${props.extension.sanitizedExtensionId}/tofu-new`)}
          />
          <Button label="Refresh" plain onClick={refresh} />
        </div>

        <PendingPlansTable pendingPlans={b.pendingPlans} />
        <FailedResourcesTable failedItems={b.failedItems} />
        <RecentEventsTable events={events} />
      </>
    );

    return (
      <TabLayout>
        <style>{stylesInline}</style>
        <div className={styles.page}>
          <header className={styles.header}>
            <h1>Tofu Controller — Overview</h1>
            <div className={styles.filter}>
              <NamespaceSelectFilter id="tofu-overview-ns-filter" />
            </div>
          </header>

          {detecting && !status ? (
            <div className={styles.statusRow}>
              <Spinner /> <span>Detecting…</span>
            </div>
          ) : !status?.crdInstalled ? (
            <NotInstalledBox status={status} refresh={refresh} />
          ) : (
            renderInstalled()
          )}
        </div>
      </TabLayout>
    );
  }),
);
