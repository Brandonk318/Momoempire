import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function StubPage({ title, eyebrow, description, bullets = [], testId }) {
  return (
    <div data-testid={testId}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Coming in Phase 2</Badge>}
      />
      <div className="surface p-8 md:p-10 max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Sparkles className="h-4 w-4" />
          <span>What this module will do</span>
        </div>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground inline-block shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex items-center gap-3">
          <Button className="btn-tenant" data-testid={`${testId}-notify-btn`}>Notify me when ready</Button>
          <span className="text-xs text-muted-foreground font-mono">API-ready · hooks reserved</span>
        </div>
      </div>
    </div>
  );
}
