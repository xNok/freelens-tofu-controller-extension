import { Terraform } from "../../k8s/terraform/terraform-v1alpha2";
import styles from "../../pages/terraform-overview.module.scss";
import { readyBadge } from "./utils";

export interface PendingPlansTableProps {
  pendingPlans: Terraform[];
}

export function PendingPlansTable({ pendingPlans }: PendingPlansTableProps) {
  if (pendingPlans.length === 0) return null;

  return (
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
          {pendingPlans.map((t) => (
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
  );
}
