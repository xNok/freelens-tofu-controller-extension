import { Renderer } from "@freelensapp/extensions";
import svgIcon from "./terraform.svg?raw";

const {
  Component: { Icon },
} = Renderer;

export function TerraformIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} svg={svgIcon} />;
}
