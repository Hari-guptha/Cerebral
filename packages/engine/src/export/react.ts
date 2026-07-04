import type { ExportOptions, ExportResult, Project } from "@svg-animator/types";
import { exportSmil } from "./smil";

export function exportReact(project: Project, options: ExportOptions): ExportResult {
  const smil = exportSmil(project, options);
  const componentName = project.name
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^[0-9]/, "A$&") || "AnimatedSvg";

  const svgInner = (smil.content as string)
    .replace(/<\?xml[^?]*\?>\s*/, "")
    .replace(/xmlns="http:\/\/www.w3.org\/2000\/svg"\s*/, "");

  const tsx = `"use client";

import type { SVGProps } from "react";

export interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function ${componentName}({ className, ...props }: ${componentName}Props) {
  return (
    ${svgInner.replace("<svg", `<svg className={className}`).replace(/\n/g, "\n    ")}
  );
}

export default ${componentName};
`;

  return {
    format: "react",
    filename: `${componentName}.tsx`,
    mimeType: "text/typescript",
    content: tsx,
    warnings: ["Requires React runtime", ...(smil.warnings ?? [])],
  };
}
