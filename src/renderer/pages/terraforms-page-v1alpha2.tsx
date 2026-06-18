import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { Terraform, type TerraformApi } from "../k8s/terraform/terraform-v1alpha2";
import styles from "./terraforms-page.module.scss";
import stylesInline from "./terraforms-page.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
  Navigation: { navigate },
} = Renderer;

const KubeObject = Terraform;
type KubeObject = Terraform;
type KubeObjectApi = TerraformApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  ready: (object: KubeObject) => KubeObject.getReadyStatus(object) ?? "",
  message: (object: KubeObject) => KubeObject.getReadyMessage(object),
  planPending: (object: KubeObject) => String(Boolean(KubeObject.getPendingPlan(object))),
  suspended: (object: KubeObject) => String(KubeObject.isSuspended(object)),
  source: (object: KubeObject) => KubeObject.getSourceRefDisplay(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Message", sortBy: "message", className: styles.message },
  { title: "Plan Pending", sortBy: "planPending", className: styles.planPending },
  { title: "Suspended", sortBy: "suspended", className: styles.suspended },
  { title: "Source", sortBy: "source", className: styles.source },
  { title: "Age", sortBy: "age", className: styles.age },
];

function readyBadge(object: KubeObject): JSX.Element {
  const status = KubeObject.getReadyStatus(object);
  if (!status) return <Badge label="Unknown" />;
  if (status === "True") return <Badge label="Ready" className="success" />;
  if (status === "False") return <Badge label="Failed" className="error" />;
  return <Badge label="Unknown" className="warning" />;
}

export interface TerraformsPageProps {
  extension: Renderer.LensExtension;
}

export const TerraformsPage = observer((props: TerraformsPageProps) =>
  withErrorPage(props, () => {
    const store = KubeObject.getStore<KubeObject>();

    return (
      <>
        <style>{stylesInline}</style>
        <KubeObjectListLayout<KubeObject, KubeObjectApi>
          tableId={`${KubeObject.crd.plural}Table`}
          className={styles.page}
          store={store}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[(object: KubeObject) => object.getSearchFields()]}
          renderHeaderTitle={KubeObject.crd.title}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: KubeObject) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <LinkToNamespace namespace={object.getNs()} />,
            readyBadge(object),
            <WithTooltip>{KubeObject.getReadyMessage(object)}</WithTooltip>,
            <BadgeBoolean value={Boolean(KubeObject.getPendingPlan(object))} />,
            <BadgeBoolean value={KubeObject.isSuspended(object)} />,
            <WithTooltip>{KubeObject.getSourceRefDisplay(object)}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
          addRemoveButtons={{
            onAdd: () => navigate(`/extension/${props.extension.sanitizedExtensionId}/tofu-new`),
            addTooltip: "New Terraform",
          }}
        />
      </>
    );
  }),
);
