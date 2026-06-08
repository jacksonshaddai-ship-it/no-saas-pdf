import type { ReactNode } from "react";
import { tools } from "@/lib/tools";
import { ToolPageLayout } from "./ToolPageLayout";

const fallbackTool = tools[0]!;

export function ToolLayout({ children }: { icon: string; title: string; description: string; children: ReactNode }) {
  return <ToolPageLayout tool={fallbackTool}>{children}</ToolPageLayout>;
}
