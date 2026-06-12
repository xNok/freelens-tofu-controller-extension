import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { showPlanInDock } from "../details/plan-viewer";
import { Terraform } from "../k8s/terraform/terraform-v1alpha2";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export interface TerraformShowPlanMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Terraform> {
  extension: Renderer.LensExtension;
}

export const TerraformShowPlanMenuItem = (props: TerraformShowPlanMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;
    if (!object) return <></>;

    return (
      <MenuItem onClick={() => showPlanInDock(object)}>
        <Icon material="receipt_long" interactive={toolbar} title="Show plan" />
        <span className="title">Show plan</span>
      </MenuItem>
    );
  });
