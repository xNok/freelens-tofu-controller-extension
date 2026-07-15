import { Terraform } from "../../k8s/terraform/terraform-v1alpha2";
import styles from "../../pages/terraform-overview.module.scss";

export interface FailedResourcesTableProps {
  failedItems: Terraform[];
}

export function FailedResourcesTable({ failedItems }: FailedResourcesTableProps) {
  if (failedItems.length === 0) return null;

  return (
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
          {failedItems.map((t) => (
            <tr key={t.getId()}>
              <td>{t.getName()}</td>
              <td>{t.getNs()}</td>
              <td>{Terraform.getReadyMessage(t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
