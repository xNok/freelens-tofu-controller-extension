import { Renderer } from "@freelensapp/extensions";
import { TERRAFORM_API_VERSION } from "../../../common/terraform-constants";
import styles from "../../pages/terraform-overview.module.scss";

import type { ControllerStatus } from "../../k8s/controller-detect";

const {
  Component: { Badge, Icon },
} = Renderer;

export interface ControllerStatusBoxProps {
  status?: ControllerStatus;
  namespace: string;
}

export function ControllerStatusBox({ status, namespace }: ControllerStatusBoxProps) {
  return (
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
        <span>Namespace:</span> <Badge label={namespace} />
      </div>
    </div>
  );
}
