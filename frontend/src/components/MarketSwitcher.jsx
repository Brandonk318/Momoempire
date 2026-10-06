import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const MARKET_META = {
  US: { flag: "🇺🇸", short: "US" },
  CA: { flag: "🇨🇦", short: "CA" },
  AU: { flag: "🇦🇺", short: "AU" },
  NZ: { flag: "🇳🇿", short: "NZ" },
  GB: { flag: "🇬🇧", short: "UK" },
};

export default function MarketSwitcher({ tenant, onTenantChange, compact = false }) {
  const [countries, setCountries] = useState([]);
  const [saving, setSaving] = useState(false);
  const current = (tenant?.country || "US").toUpperCase();

  useEffect(() => {
    let active = true;
    api.get("/countries?enabled_only=true")
      .then((r) => { if (active) setCountries(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setCountries([]); });
    return () => { active = false; };
  }, []);

  const currentCountry = useMemo(
    () => countries.find((c) => (c.code || "").toUpperCase() === current),
    [countries, current]
  );

  async function changeMarket(code) {
    const next = (code || "").toUpperCase();
    if (!next || next === current || saving) return;
    setSaving(true);
    try {
      await api.put("/tenants/me/country", { country: next });
      try { localStorage.setItem("aiop_market", next); } catch {}
      onTenantChange?.((prev) => ({ ...(prev || {}), country: next }));
    } finally {
      setSaving(false);
    }
  }

  const meta = MARKET_META[current] || { flag: "🌐", short: current };
  const label = currentCountry?.name || current;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          className="gap-2"
          data-testid="market-switcher-btn"
          aria-label={`Change market. Current market: ${label}`}
          disabled={saving}
        >
          <MapPin className="h-4 w-4" />
          <span aria-hidden="true">{meta.flag}</span>
          <span className="text-[12px] font-medium">{meta.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="market-switcher-menu">
        {countries.length === 0 ? (
          <DropdownMenuItem disabled>No markets available</DropdownMenuItem>
        ) : countries.map((country) => {
          const code = (country.code || "").toUpperCase();
          const itemMeta = MARKET_META[code] || { flag: "🌐", short: code };
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => changeMarket(code)}
              data-testid={`market-opt-${code.toLowerCase()}`}
            >
              <span className="mr-2" aria-hidden="true">{itemMeta.flag}</span>
              <span>{country.name || code}</span>
              {code === current && <span className="ml-auto text-muted-foreground">Current</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
