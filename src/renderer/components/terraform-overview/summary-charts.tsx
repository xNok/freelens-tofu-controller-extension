import { Renderer } from "@freelensapp/extensions";
import styles from "../../pages/terraform-overview.module.scss";
import { COLORS } from "./constants";

import type { Buckets } from "./types";

const {
  Component: { PieChart },
  Navigation: { navigate },
} = Renderer;

export interface SummaryChartsProps {
  bucket: Buckets;
  terraformsUrl: string;
  crdTitle: string;
}

export function SummaryCharts({ bucket: b, terraformsUrl, crdTitle }: SummaryChartsProps) {
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

  return (
    <div className={styles.statuses}>
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>
          <a
            onClick={(e) => {
              e.preventDefault();
              navigate(terraformsUrl);
            }}
          >
            {crdTitle} ({b.total})
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
  );
}
