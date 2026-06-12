import { Common } from "@freelensapp/extensions";
import { makeObservable, observable } from "mobx";
import { CONTROLLER_DEFAULT_NAMESPACE } from "../terraform-constants";

export interface TerraformPreferencesModel {
  controllerNamespace: string;
}

export class TerraformPreferencesStore extends Common.Store.ExtensionStore<TerraformPreferencesModel> {
  @observable controllerNamespace: string = CONTROLLER_DEFAULT_NAMESPACE;

  constructor() {
    super({
      configName: "terraform-preferences-store",
      defaults: {
        controllerNamespace: CONTROLLER_DEFAULT_NAMESPACE,
      },
    });
    makeObservable(this);
  }

  fromStore({ controllerNamespace }: TerraformPreferencesModel): void {
    this.controllerNamespace = controllerNamespace || CONTROLLER_DEFAULT_NAMESPACE;
  }

  toJSON(): TerraformPreferencesModel {
    return {
      controllerNamespace: this.controllerNamespace,
    };
  }
}
