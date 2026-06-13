import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { TerraformPreferencesStore } from "../../common/store";
import { CONTROLLER_DEFAULT_NAMESPACE } from "../../common/terraform-constants";

const { observer } = MobxReact;
const {
  Component: { Input },
} = Renderer;

const preferences = TerraformPreferencesStore.getInstanceOrCreate<TerraformPreferencesStore>();

export const TerraformPreferenceInput = observer(() => {
  return (
    <Input
      theme="round-black"
      placeholder={CONTROLLER_DEFAULT_NAMESPACE}
      value={preferences.controllerNamespace}
      onChange={(v: string) => {
        preferences.controllerNamespace = v || CONTROLLER_DEFAULT_NAMESPACE;
      }}
    />
  );
});

export const TerraformPreferenceHint = () => (
  <span>
    Namespace where the tofu-controller is deployed. Used to detect installation status and to locate runner pods for
    the break-glass action.
  </span>
);
