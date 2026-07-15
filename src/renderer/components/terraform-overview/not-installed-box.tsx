import { Renderer } from "@freelensapp/extensions";
import { INSTALL_DOCS_URL, RELEASE_MANIFEST_URL, TERRAFORM_API_VERSION } from "../../../common/terraform-constants";
import styles from "../../pages/terraform-overview.module.scss";

import type { ControllerStatus } from "../../k8s/controller-detect";

const {
  Component: { Button },
} = Renderer;

export interface NotInstalledBoxProps {
  status?: ControllerStatus;
  refresh: () => void;
}

export function NotInstalledBox({ status, refresh }: NotInstalledBoxProps) {
  const installCommand = `kubectl apply -f ${RELEASE_MANIFEST_URL}`;

  return (
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
}
