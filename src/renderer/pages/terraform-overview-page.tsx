import { Common, Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TerraformPreferencesStore } from "../../common/store";
import {
  INSTALL_DOCS_URL,
  RELEASE_MANIFEST_URL,
  TERRAFORM_API_VERSION,
  TERRAFORM_GROUP,
  TERRAFORM_KIND,
} from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { type ControllerStatus, detectController } from "../k8s/controller-detect";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";
import styles from "./terraform-overview.module.scss";
import stylesInline from "./terraform-overview.module.scss?inline";

const { observer } = MobxReact;
const {
  Component: { Badge, Button, Icon, NamespaceSelectFilter, PieChart, Spinner, TabLayout },
  K8sApi: { eventStore },
  Navigation: { navigate },
} = Renderer;

export interface TerraformOverviewPageProps {
  extension: Renderer.LensExtension;
}

interface Buckets {
  total: number;
  ready: number;
  notReady: number;
  inProgress: number;
  suspended: number;
  unknown: number;
  pendingPlans: Terraform[];
  failedItems: Terraform[];
  lockedItems: Terraform[];
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

const COLORS = {
  ready: "#43a047",
  notReady: "#ce3933",
  inProgress: "#FF6600",
  suspended: "#3d90ce",
  unknown: "#9e9e9e",
};

function readyBadge(t: Terraform) {
  const status = Terraform.getReadyStatus(t);
  if (status === "True") return <Badge label="Ready" className="success" />;
  if (status === "False") return <Badge label="Failed" className="error" />;
  return <Badge label="Unknown" className="warning" />;
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

    const installCommand = `kubectl apply -f ${RELEASE_MANIFEST_URL}`;

    // chart.js types aren't installed; cast through unknown to satisfy strict TS while keeping runtime shape.
    const chartData = {
      labels: [
        `Ready: ${b.ready}`,
        `Not Ready: ${b.notReady}`,
        `In Progress: ${b.inProgress}`,
        `Suspended: ${b.suspended}`,
        `Unknown: ${b.unknown}`,
      ],
      datasets: [
        {
          data: [b.ready, b.notReady, b.inProgress, b.suspended, b.unknown],
          backgroundColor: [COLORS.ready, COLORS.notReady, COLORS.inProgress, COLORS.suspended, COLORS.unknown],
          tooltipLabels: [
            (p: string) => `Ready: ${p}`,
            (p: string) => `Not Ready: ${p}`,
            (p: string) => `In Progress: ${p}`,
            (p: string) => `Suspended: ${p}`,
            (p: string) => `Unknown: ${p}`,
          ],
        },
      ],
    } as unknown as Renderer.Component.PieChartData;

    const terraformsUrl = `/extension/${props.extension.sanitizedExtensionId}/tofu-terraforms`;

    const renderInstalled = () => (
      <>
        <div className={styles.controllerBox}>
          <div className={styles.statusRow}>
            <Icon material={status?.controllerDeployed ? "check_circle" : "cancel"} />
            <strong>
              {status?.controllerDeployed
                ? status.controllerReady
                  ? "Controller running"
                  : "Controller deployed, not ready"
                : "Controller deployment not found"}
            </strong>
          </div>
          {status?.controllerDeploymentName ? (
            <div className={styles.statusRow}>
              <span>Deployment:</span> <Badge label={status.controllerDeploymentName} />
            </div>
          ) : null}
          {status?.controllerImage ? (
            <div className={styles.statusRow}>
              <span>Image:</span> <Badge label={status.controllerImage} />
            </div>
          ) : null}
          <div className={styles.statusRow}>
            <span>CRD:</span> <Badge label={TERRAFORM_API_VERSION} className="success" />
          </div>
          <div className={styles.statusRow}>
            <span>Namespace:</span> <Badge label={preferences.controllerNamespace} />
          </div>
        </div>

        <div className={styles.statuses}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(terraformsUrl);
                }}
              >
                {Terraform.crd.title} ({b.total})
              </a>
            </div>
            <div className={styles.chartWrapper}>
              {b.total > 0 ? (
                <PieChart data={chartData} />
              ) : (
                <p style={{ color: "var(--textColorSecondary, #888)" }}>No Terraform resources yet.</p>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Pending plans</div>
            <div className={styles.value} style={{ fontSize: "2.5rem", color: COLORS.inProgress }}>
              {b.pendingPlans.length}
            </div>
            <div style={{ color: "var(--textColorSecondary, #888)", fontSize: "0.85rem" }}>awaiting approval</div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>State locks</div>
            <div className={styles.value} style={{ fontSize: "2.5rem", color: COLORS.notReady }}>
              {b.lockedItems.length}
            </div>
            <div style={{ color: "var(--textColorSecondary, #888)", fontSize: "0.85rem" }}>currently held</div>
          </div>
        </div>

        <div className={styles.actions} style={{ marginTop: "1rem" }}>
          <Button label="Open Terraforms" primary onClick={() => navigate(terraformsUrl)} />
          <Button
            label="New Terraform"
            onClick={() => navigate(`/extension/${props.extension.sanitizedExtensionId}/tofu-new`)}
          />
          <Button label="Refresh" plain onClick={refresh} />
        </div>

        {b.pendingPlans.length > 0 ? (
          <div className={styles.section}>
            <h2>Pending plans</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Namespace</th>
                  <th>Plan ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {b.pendingPlans.map((t) => (
                  <tr key={t.getId()}>
                    <td>{t.getName()}</td>
                    <td>{t.getNs()}</td>
                    <td>{Terraform.getPendingPlan(t)}</td>
                    <td>{readyBadge(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {b.failedItems.length > 0 ? (
          <div className={styles.section}>
            <h2>Failed resources</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Namespace</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {b.failedItems.map((t) => (
                  <tr key={t.getId()}>
                    <td>{t.getName()}</td>
                    <td>{t.getNs()}</td>
                    <td>{Terraform.getReadyMessage(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {events.length > 0 ? (
          <div className={styles.section}>
            <h2>Recent events</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Object</th>
                  <th>Message</th>
                  <th>Age</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const ts = e.lastTimestamp ?? e.metadata.creationTimestamp;
                  return (
                    <tr key={e.getId()}>
                      <td>
                        <Badge label={e.type ?? "—"} className={e.type === "Warning" ? "warning" : "info"} />
                      </td>
                      <td>{e.reason ?? "—"}</td>
                      <td>
                        {e.involvedObject?.kind}/{e.involvedObject?.name}
                      </td>
                      <td>{e.message ?? "—"}</td>
                      <td title={ts}>{ts ? new Date(ts).toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </>
    );

    const renderNotInstalled = () => (
      <div className={styles.installBox}>
        <strong>
          {status?.error ? "Cannot determine controller status." : "tofu-controller is not installed on this cluster."}
        </strong>
        {status?.error ? (
          <p>
            Permission error while detecting the controller:
            <br />
            <code>{status.error}</code>
          </p>
        ) : (
          <p>
            The <code>Terraform</code> CRD ({TERRAFORM_API_VERSION}) was not found. Apply the upstream release manifest:
          </p>
        )}
        {!status?.error ? <pre>{installCommand}</pre> : null}
        <div className={styles.actions}>
          <Button label="Re-detect" primary onClick={refresh} />
          {!status?.error ? (
            <>
              <Button label="Copy install command" onClick={() => navigator.clipboard?.writeText(installCommand)} />
              <Button
                label="Open install docs"
                onClick={() => window.open(INSTALL_DOCS_URL, "_blank", "noopener,noreferrer")}
              />
            </>
          ) : null}
        </div>
      </div>
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
            renderNotInstalled()
          ) : (
            renderInstalled()
          )}
        </div>
      </TabLayout>
    );
  }),
);
