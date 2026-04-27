import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
