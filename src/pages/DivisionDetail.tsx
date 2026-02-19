import { useParams, useNavigate } from "react-router-dom";
import { DIVISIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";

const DivisionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const division = DIVISIONS.find(
    d => d.key === slug || d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") === slug
  );

  if (!division) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">Division not found: {slug}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{division.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{division.name}</h1>
            <p className="text-xs text-muted-foreground">{division.sub} — {division.brands.length} brands</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5" style={{ borderLeftColor: division.color, borderLeftWidth: 4 }}>
        <p className="text-sm text-muted-foreground">
          The <span className="font-semibold text-foreground">{division.name}</span> division manages {division.brands.length} brands
          across the <span className="text-foreground">{division.sub}</span> vertical.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Brands</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {division.brands.map(brand => {
            const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
            return (
              <button
                key={brand}
                onClick={() => navigate(`/brand/${brandSlug}`)}
                className="group rounded-lg border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-gold-glow"
              >
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{brand}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{division.name}</p>
                <div className="mt-2 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: division.color }} />
                  <span className="text-[9px] text-muted-foreground">{division.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DivisionDetail;
