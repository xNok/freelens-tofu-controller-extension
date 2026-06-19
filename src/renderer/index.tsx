/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { TerraformPreferencesStore } from "../common/store";
import { TerraformDetails } from "./details/terraform-details-v1alpha2";
import { TerraformIcon } from "./icons";
import { Terraform } from "./k8s/terraform/terraform-v1alpha2";
import { TerraformApprovePlanMenuItem } from "./menus/terraform-approve-plan-menu-item";
import { TerraformBreakGlassMenuItem } from "./menus/terraform-break-glass-menu-item";
import { TerraformForceUnlockMenuItem } from "./menus/terraform-force-unlock-menu-item";
import { TerraformReconcileMenuItem } from "./menus/terraform-reconcile-menu-item";
import { TerraformReplanMenuItem } from "./menus/terraform-replan-menu-item";
import { TerraformShowPlanMenuItem } from "./menus/terraform-show-plan-menu-item";
import { TerraformSuspendToggleMenuItem } from "./menus/terraform-suspend-toggle-menu-item";
import { TerraformNewPage } from "./pages/terraform-new-page";
import { TerraformOverviewPage } from "./pages/terraform-overview-page";
import { TerraformsPage } from "./pages/terraforms-page-v1alpha2";
import { TerraformPreferenceHint, TerraformPreferenceInput } from "./preferences/terraform-preference";

export default class TofuControllerRenderer extends Renderer.LensExtension {
  async onActivate() {
    TerraformPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Tofu Controller",
      components: {
        Input: () => <TerraformPreferenceInput />,
        Hint: () => <TerraformPreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems = [
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<Terraform>) => (
          <TerraformDetails {...props} extension={this} />
        ),
      },
    },
  ];

  clusterPages = [
    {
      id: "tofu-overview",
      components: {
        Page: () => <TerraformOverviewPage extension={this} />,
      },
    },
    {
      id: "tofu-terraforms",
      components: {
        Page: () => <TerraformsPage extension={this} />,
      },
    },
    {
      id: "tofu-new",
      components: {
        Page: () => <TerraformNewPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "tofu-controller",
      title: "Tofu Controller",
      components: {
        Icon: TerraformIcon,
      },
    },
    {
      parentId: "tofu-controller",
      target: { pageId: "tofu-overview" },
      title: "Overview",
      components: {
        Icon: () => null,
      },
    },
    {
      parentId: "tofu-controller",
      target: { pageId: "tofu-terraforms" },
      title: "Terraforms",
      components: {
        Icon: () => null,
      },
    },
  ];

  kubeObjectMenuItems = [
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformReconcileMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformSuspendToggleMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformApprovePlanMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformReplanMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformShowPlanMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformForceUnlockMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: Terraform.kind,
      apiVersions: Terraform.crd.apiVersions,
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<Terraform>) => (
          <TerraformBreakGlassMenuItem {...props} extension={this} />
        ),
      },
    },
  ];

  commands = [
    {
      id: "tofu-controller.overview",
      title: "Tofu Controller: open overview",
      action: ({ navigate }: { navigate: (url: string) => void }) => {
        navigate(`/extension/${this.sanitizedExtensionId}/tofu-overview`);
      },
    },
    {
      id: "tofu-controller.terraforms.list",
      title: "Tofu Controller: open Terraform list",
      action: ({ navigate }: { navigate: (url: string) => void }) => {
        navigate(`/extension/${this.sanitizedExtensionId}/tofu-terraforms`);
      },
    },
    {
      id: "tofu-controller.terraforms.new",
      title: "Tofu Controller: new Terraform resource",
      action: ({ navigate }: { navigate: (url: string) => void }) => {
        navigate(`/extension/${this.sanitizedExtensionId}/tofu-new`);
      },
    },
  ];
}
