import { Main } from "@freelensapp/extensions";
import { TerraformPreferencesStore } from "../common/store";

export default class TofuControllerMain extends Main.LensExtension {
  async onActivate() {
    await TerraformPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }
}
