import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS, EVENTS_2026 } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, BarChart3, Package, Newspaper } from "lucide-react";
import { format } from "date-fns";

const allBrands = DIVISIONS.flatMap(d => d.brands);
const ASSET_TYPES = ['Logo', 'Brand Guide', 'Social Templates', 'Press Kit', 'Photos'];

const Outputs = () => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [prBrand, setPrBrand] = useState('');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetTypes, setAssetTypes] = useState<string[]>([]);

  const { data: ledger = [] } = useQuery({
    queryKey: ['ledger-actions'],
    queryFn: async () => {
      const { data } = await supabase.from('ledger_actions').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const toggleAssetType = (type: string) => {
    setAssetTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Outputs</h1>

      {/* Output Generators */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Proof Pack */}
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Proof Pack</h3>
              <p className="text-xs text-muted-foreground">Generate proof pack for event</p>
            </div>
          </div>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="mb-3 bg-secondary"><SelectValue placeholder="Select event" /></SelectTrigger>
            <SelectContent>
              {EVENTS_2026.map((e, i) => (
                <SelectItem key={i} value={`${e.name}-${e.date}`}>{e.name} — {e.city} ({e.date})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="command" className="w-full" disabled={!selectedEvent}
            onClick={() => sendCommand('proofpack.generate', { event: selectedEvent.split('-')[0], brand: selectedEvent })}>
            Generate Proof Pack
          </Button>
        </div>

        {/* Weekly Report */}
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-info/10">
              <BarChart3 className="h-5 w-5 text-status-info" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Weekly Report</h3>
              <p className="text-xs text-muted-foreground">Generate enterprise weekly report</p>
            </div>
          </div>
          <Button variant="command" className="w-full" onClick={() => sendCommand('report.weekly', {})}>
            Generate Weekly Report
          </Button>
        </div>

        {/* Asset Bundle */}
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-purple/10">
              <Package className="h-5 w-5 text-status-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Asset Bundle</h3>
              <p className="text-xs text-muted-foreground">Export brand assets</p>
            </div>
          </div>
          <Select value={assetBrand} onValueChange={setAssetBrand}>
            <SelectTrigger className="mb-3 bg-secondary"><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="mb-3 flex flex-wrap gap-3">
            {ASSET_TYPES.map(t => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={assetTypes.includes(t)} onCheckedChange={() => toggleAssetType(t)} />
                {t}
              </label>
            ))}
          </div>
          <Button variant="command" className="w-full" disabled={!assetBrand || assetTypes.length === 0}
            onClick={() => sendCommand('asset.bundle_export', { brand: assetBrand, asset_types: assetTypes })}>
            Export Assets
          </Button>
        </div>

        {/* PR Kit */}
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-pink/10">
              <Newspaper className="h-5 w-5 text-status-pink" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">PR Kit</h3>
              <p className="text-xs text-muted-foreground">Generate press kit for brand</p>
            </div>
          </div>
          <Select value={prBrand} onValueChange={setPrBrand}>
            <SelectTrigger className="mb-3 bg-secondary"><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="command" className="w-full" disabled={!prBrand}
            onClick={() => sendCommand('proofpack.generate', { event: prBrand, brand: prBrand, type: 'prkit' })}>
            Generate PR Kit
          </Button>
        </div>
      </div>

      {/* Action Ledger */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Ledger</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Action Type</TableHead>
                <TableHead className="text-muted-foreground">Tenant</TableHead>
                <TableHead className="text-muted-foreground">Metadata</TableHead>
                <TableHead className="text-muted-foreground">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((item: any, i: number) => (
                <TableRow key={item.id || i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-foreground">{item.action_type || '—'}</TableCell>
                  <TableCell className="text-sm text-foreground">{item.tenant || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-[10px] text-muted-foreground">
                    {item.metadata ? JSON.stringify(item.metadata).slice(0, 80) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.created_at ? format(new Date(item.created_at), 'MMM d HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {ledger.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No ledger entries</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Outputs;
