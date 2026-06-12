import { Renderer } from "@freelensapp/extensions";
import { useState } from "react";
import { TERRAFORM_API_VERSION, TERRAFORM_KIND } from "../../common/terraform-constants";
import { withErrorPage } from "../components/error-page";
import { Terraform, type TerraformSpec } from "../k8s/terraform/terraform-v1alpha2";
import styles from "./terraform-new.module.scss";
import stylesInline from "./terraform-new.module.scss?inline";

const {
  Component: { Button, Checkbox, Input, Notifications, Select },
  Navigation: { navigate },
} = Renderer;

type SourceKind = "GitRepository" | "OCIRepository" | "Bucket";
const sourceKindOptions: { value: SourceKind; label: SourceKind }[] = [
  { value: "GitRepository", label: "GitRepository" },
  { value: "OCIRepository", label: "OCIRepository" },
  { value: "Bucket", label: "Bucket" },
];

export interface TerraformNewPageProps {
  extension: Renderer.LensExtension;
}

export const TerraformNewPage = (props: TerraformNewPageProps) =>
  withErrorPage(props, () => {
    const [name, setName] = useState("");
    const [namespace, setNamespace] = useState("flux-system");
    const [sourceKind, setSourceKind] = useState<SourceKind>("GitRepository");
    const [sourceName, setSourceName] = useState("");
    const [sourceNamespace, setSourceNamespace] = useState("");
    const [path, setPath] = useState("./");
    const [interval, setInterval] = useState("1m");
    const [approvePlan, setApprovePlan] = useState("");
    const [planOnly, setPlanOnly] = useState(false);
    const [destroy, setDestroy] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
      if (!name || !namespace || !sourceName || !interval) {
        Notifications.error("Name, namespace, source name, and interval are required");
        return;
      }
      setSubmitting(true);
      try {
        const store = Terraform.getStore<Terraform>();
        const spec: TerraformSpec = {
          interval,
          path,
          sourceRef: {
            kind: sourceKind,
            name: sourceName,
            ...(sourceNamespace ? { namespace: sourceNamespace } : {}),
          },
          ...(approvePlan ? { approvePlan } : {}),
          ...(planOnly ? { planOnly: true } : {}),
          ...(destroy ? { destroy: true } : {}),
        };
        await store.create(
          { name, namespace },
          {
            apiVersion: TERRAFORM_API_VERSION,
            kind: TERRAFORM_KIND,
            spec,
          },
        );
        Notifications.ok(`Created Terraform ${namespace}/${name}`);
        navigate(`/extension/${props.extension.sanitizedExtensionId}/terraforms`);
      } catch (err) {
        Notifications.error(`Create failed: ${err}`);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.page}>
          <h1>New Terraform resource</h1>
          <p className={styles.hint}>
            Creates an <code>{TERRAFORM_KIND}</code> in <code>{TERRAFORM_API_VERSION}</code>. The source must already
            exist in the cluster.
          </p>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="tf-name">Name</label>
              <Input id="tf-name" value={name} onChange={setName} placeholder="my-stack" />
            </div>
            <div className={styles.field}>
              <label htmlFor="tf-namespace">Namespace</label>
              <Input id="tf-namespace" value={namespace} onChange={setNamespace} placeholder="flux-system" />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Source kind</label>
              <Select
                id="tf-source-kind"
                themeName="lens"
                options={sourceKindOptions}
                value={sourceKind}
                onChange={(opt) => setSourceKind((opt?.value as SourceKind) ?? "GitRepository")}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tf-source-name">Source name</label>
              <Input id="tf-source-name" value={sourceName} onChange={setSourceName} placeholder="my-repo" />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="tf-source-ns">Source namespace</label>
              <Input
                id="tf-source-ns"
                value={sourceNamespace}
                onChange={setSourceNamespace}
                placeholder="(defaults to Terraform namespace)"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tf-path">Path</label>
              <Input id="tf-path" value={path} onChange={setPath} placeholder="./" />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="tf-interval">Interval</label>
              <Input id="tf-interval" value={interval} onChange={setInterval} placeholder="1m" />
            </div>
            <div className={styles.field}>
              <label htmlFor="tf-approve">Approve plan</label>
              <Input
                id="tf-approve"
                value={approvePlan}
                onChange={setApprovePlan}
                placeholder="(empty) | auto | <plan-id>"
              />
            </div>
          </div>

          <div className={styles.field}>
            <Checkbox label="Plan only (no apply)" value={planOnly} onChange={setPlanOnly} />
          </div>
          <div className={styles.field}>
            <Checkbox label="Destroy on reconcile" value={destroy} onChange={setDestroy} />
          </div>

          <div className={styles.actions}>
            <Button label="Create" primary disabled={submitting} onClick={submit} waiting={submitting} />
          </div>
        </div>
      </>
    );
  });
