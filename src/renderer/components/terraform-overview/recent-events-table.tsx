import { Renderer } from "@freelensapp/extensions";
import styles from "../../pages/terraform-overview.module.scss";

const {
  Component: { Badge },
} = Renderer;

export interface RecentEventsTableProps {
  events: Renderer.K8sApi.KubeEvent[];
}

export function RecentEventsTable({ events }: RecentEventsTableProps) {
  if (events.length === 0) return null;

  return (
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
  );
}
