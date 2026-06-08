import { toolCategories, getToolsByCategory } from "@/lib/tools";
import { ToolCard } from "./ToolCard";

export function ToolGrid() {
  return (
    <div className="space-y-10" id="ferramentas">
      {toolCategories.map((category) => {
        const categoryTools = getToolsByCategory(category.id);

        return (
          <section id={category.id} key={category.id} className="scroll-mt-32">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{category.label}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{category.description}</p>
              </div>
              <span className="text-sm font-bold text-slate-500">{categoryTools.length} ferramentas</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
