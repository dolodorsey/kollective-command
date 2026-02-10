import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { CommandConfirmDialog } from "@/components/CommandConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Phone, Send, AlertTriangle, UserX } from "lucide-react";
import { format } from "date-fns";

const CHANNELS = ['All', 'Email', 'Instagram DM', 'SMS', 'Facebook'];

const channelIcon = (ch: string) => {
  if (ch?.toLowerCase().includes('instagram') || ch?.toLowerCase().includes('dm')) return MessageSquare;
  if (ch?.toLowerCase().includes('sms') || ch?.toLowerCase().includes('phone')) return Phone;
  return Mail;
};

const InboxPage = () => {
  const [activeChannel, setActiveChannel] = useState('All');
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [confirm, setConfirm] = useState({ open: false, title: '', description: '', action: () => {} });

  const { data: messages = [] } = useQuery({
    queryKey: ['inbox-messages'],
    queryFn: async () => {
      const [social, pr] = await Promise.all([
        supabase.from('social_activity').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('pr_outreach_activity').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      return [
        ...(social.data || []).map((s: any) => ({ ...s, source: 'social', channel: s.platform || s.channel || 'DM' })),
        ...(pr.data || []).map((p: any) => ({ ...p, source: 'pr', channel: p.channel || 'Email' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const filtered = activeChannel === 'All'
    ? messages
    : messages.filter((m: any) => m.channel?.toLowerCase().includes(activeChannel.toLowerCase()));

  const handleReply = () => {
    if (!selectedThread || !replyText.trim()) return;
    setConfirm({
      open: true,
      title: 'Send Reply',
      description: `This will send a reply to thread ${selectedThread.id}. This action cannot be undone.`,
      action: async () => {
        await sendCommand('inbox.reply_send', { thread_id: selectedThread.id, message: replyText }, 'high');
        setReplyText('');
      },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Inbox Console</h1>

      {/* Channel Tabs */}
      <div className="flex gap-1">
        {CHANNELS.map(ch => (
          <Button key={ch} size="sm" variant={activeChannel === ch ? 'default' : 'ghost'} onClick={() => setActiveChannel(ch)} className="text-xs">
            {ch}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ minHeight: 500 }}>
        {/* Message List */}
        <div className="lg:col-span-1 rounded-lg border border-border/50 bg-card overflow-auto" style={{ maxHeight: 600 }}>
          {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No messages</p>}
          {filtered.map((msg: any, i: number) => {
            const Icon = channelIcon(msg.channel);
            const isSelected = selectedThread?.id === msg.id;
            return (
              <button
                key={msg.id || i}
                onClick={() => setSelectedThread(msg)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/20 p-4 text-left transition-colors hover:bg-muted/30",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{msg.contact_name || msg.sender || msg.brand || 'Unknown'}</span>
                    <StatusBadge variant="info" className="text-[8px]">{msg.channel}</StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{msg.message || msg.content || msg.step || 'No preview'}</p>
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground/60">
                    {msg.created_at ? format(new Date(msg.created_at), 'MMM d, HH:mm') : '—'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Thread View */}
        <div className="lg:col-span-2 flex flex-col rounded-lg border border-border/50 bg-card">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a message to view</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{selectedThread.contact_name || selectedThread.sender || 'Unknown'}</h3>
                    <p className="text-xs text-muted-foreground">{selectedThread.channel} · {selectedThread.source}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => sendCommand('inbox.escalate', { thread_id: selectedThread.id, to: 'manager' })}>
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Escalate
                    </Button>
                    <Button variant="ghost" size="sm" className="text-status-error" onClick={() => sendCommand('contact.dnc', { contact_id: selectedThread.contact_id || selectedThread.id })}>
                      <UserX className="mr-1 h-3.5 w-3.5" /> DNC
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm text-foreground">{selectedThread.message || selectedThread.content || selectedThread.step || 'No content'}</p>
                  <span className="mt-2 block font-mono text-[10px] text-muted-foreground">
                    {selectedThread.created_at ? format(new Date(selectedThread.created_at), 'PPpp') : ''}
                  </span>
                </div>
              </div>
              <div className="border-t border-border/30 p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="min-h-[60px] flex-1 resize-none bg-secondary"
                  />
                  <Button onClick={handleReply} disabled={!replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CommandConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm(p => ({ ...p, open: o }))}
        title={confirm.title}
        description={confirm.description}
        onConfirm={() => { confirm.action(); setConfirm(p => ({ ...p, open: false })); }}
      />
    </div>
  );
};

export default InboxPage;
