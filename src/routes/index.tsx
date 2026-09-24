import { createFileRoute } from "@tanstack/react-router";
import { WorkflowStudio } from "@/components/workflow/workflow-studio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowcraft — Visual Workflow Studio" },
      { name: "description", content: "Design, test, and monitor powerful automated workflows in a visual canvas." },
      { property: "og:title", content: "Flowcraft — Visual Workflow Studio" },
      { property: "og:description", content: "Design, test, and monitor powerful automated workflows in a visual canvas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowStudio,
});
