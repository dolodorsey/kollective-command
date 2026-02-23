import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bot, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Chat = () => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("notes");

  const { data: notes = [] } = useQuery({
    queryKey: ["chat-notes"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log")
        .select("*")
        .eq("command_type", "chat_note")
        .order("executed_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const sendNote = async () => {
    if (!message.trim()) return;
    await supabase.from("command_log").insert({
      command_type: "chat_note",
      scope: "personal",
      status: "success",
      payload: { message: message.trim(), from: "dr_dorsey" },
      executed_at: new Date().toISOString(),
    });
    setMessage("");
    toast.success("Note saved");
    queryClient.invalidateQueries({ queryKey: ["chat-notes"] });
  };

  const deleteNote = async (id: string) => {
    await supabase.from("command_log").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["chat-notes"] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Chat & Notes</h1>
      <p className="text-sm text-muted-foreground">Quick notes to yourself, AI dispatch commands, and team messages.</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="notes">My Notes</TabsTrigger>
          <TabsTrigger value="ai">AI Dispatch</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <div className="bg-white border rounded-lg p-6 min-h-[400px] max-h-[500px] overflow-y-auto space-y-3">
            {notes.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No notes yet. Write something below.</p>}
            {notes.map((note: any) => (
              <div key={note.id} className="flex justify-between items-start group">
                <div className="bg-gray-900 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{note.payload?.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{note.executed_at ? format(new Date(note.executed_at), 'MMM d, h:mm a') : ''}</p>
                </div>
                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteNote(note.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Textarea placeholder="Write a note..." value={message} onChange={e => setMessage(e.target.value)} className="flex-1" rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNote(); } }} />
            <Button onClick={sendNote} disabled={!message.trim()} className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">AI Dispatch coming soon.</p>
            <p className="text-xs text-muted-foreground mt-1">Send tasks to Linda, Claire, or Evan from here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Chat;
