import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, Inbox, Loader2, Mail, MessageSquare,
  Search, Send, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type SupportThread,
  useAdminReplySupport,
  useAdminSupportMessages,
  useAdminSupportThreads,
  useAdminUpdateSupportStatus,
  useRealtimeAdminSupport,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "PIN Sent", value: "pin_sent" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending_admin" },
  { label: "Resolved", value: "resolved" },
] as const;

const statusConfig = {
  pin_sent: { label: "PIN Sent", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", Icon: Clock },
  open: { label: "Open", cls: "bg-primary/10 text-primary border-primary/20", Icon: MessageSquare },
  pending_admin: { label: "Pending", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20", Icon: Inbox },
  resolved: { label: "Resolved", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", Icon: CheckCircle2 },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground border-border/40", Icon: XCircle },
} satisfies Record<SupportThread["status"], { label: string; cls: string; Icon: React.ElementType }>;

const StatusBadge = ({ status }: { status: SupportThread["status"] }) => {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  );
};

const AdminSupport = () => {
  useRealtimeAdminSupport();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>(undefined);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: threads, isLoading } = useAdminSupportThreads(filter);
  const { data: messages, isLoading: messagesLoading } = useAdminSupportMessages(selectedId);
  const sendReply = useAdminReplySupport();
  const updateStatus = useAdminUpdateSupportStatus();

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads ?? [];
    return (threads ?? []).filter((thread) =>
      thread.subject.toLowerCase().includes(term) ||
      thread.email.toLowerCase().includes(term) ||
      thread.support_pin.includes(term) ||
      thread.last_message_preview.toLowerCase().includes(term)
    );
  }, [search, threads]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedId) ?? filteredThreads[0] ?? null;

  useEffect(() => {
    if (!selectedId && filteredThreads.length > 0) {
      setSelectedId(filteredThreads[0].id);
      return;
    }

    if (selectedId && filteredThreads.length > 0 && !filteredThreads.some((thread) => thread.id === selectedId)) {
      setSelectedId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedId]);

  const handleReply = () => {
    if (!selectedThread || !reply.trim()) return;

    sendReply.mutate(
      { requestId: selectedThread.id, message: reply },
      {
        onSuccess: () => {
          toast.success("Support reply sent.");
          setReply("");
        },
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  const handleStatus = (status: SupportThread["status"]) => {
    if (!selectedThread) return;
    updateStatus.mutate(
      { requestId: selectedThread.id, status },
      {
        onSuccess: () => toast.success(`Thread marked ${statusConfig[status].label.toLowerCase()}.`),
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground">Review support threads and respond by email.</p>
      </div>

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded border border-border/40 bg-gradient-card">
          <div className="space-y-3 border-b border-border/20 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search email, subject, PIN..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="border-border/50 bg-background pl-10 text-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === item.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center rounded border border-dashed border-border/50 p-6 text-center">
                <Inbox size={28} className="mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No support threads found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredThreads.map((thread, index) => (
                  <motion.button
                    key={thread.id}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.2) }}
                    onClick={() => setSelectedId(thread.id)}
                    className={`w-full rounded border p-3 text-left transition-colors ${
                      selectedThread?.id === thread.id
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/30 bg-background/60 hover:border-primary/20"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{thread.subject}</p>
                      <StatusBadge status={thread.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{thread.email}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{thread.last_message_preview}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">PIN {thread.support_pin}</span>
                      <span>{formatDate(thread.last_message_at)}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded border border-border/40 bg-gradient-card">
          {!selectedThread ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Mail size={32} className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a support thread to view the conversation.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-foreground">{selectedThread.subject}</h2>
                      <StatusBadge status={selectedThread.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedThread.email}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Support PIN: {selectedThread.support_pin}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatus("resolved")}
                      disabled={updateStatus.isPending || selectedThread.status === "resolved"}
                    >
                      <CheckCircle2 size={14} />
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatus("closed")}
                      disabled={updateStatus.isPending || selectedThread.status === "closed"}
                    >
                      <XCircle size={14} />
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="space-y-4">
                  <div className="rounded border border-border/30 bg-background/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted-foreground">Initial request</span>
                      <span className="text-xs text-muted-foreground">{formatDate(selectedThread.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{selectedThread.initial_message}</p>
                  </div>

                  {messagesLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 className="animate-spin text-primary" size={22} />
                    </div>
                  ) : (
                    (messages ?? []).map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[82%] rounded border p-4 ${
                          message.sender_type === "admin"
                            ? "border-primary/20 bg-primary/10"
                            : "border-border/30 bg-background/70"
                        }`}>
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <span className="text-xs font-medium capitalize text-muted-foreground">
                              {message.sender_type}
                              {message.sender_email ? ` · ${message.sender_email}` : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-border/20 p-5">
                <Textarea
                  placeholder="Write a reply to the customer..."
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="min-h-[120px] border-border/50 bg-background text-foreground"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Replies are emailed to the customer and saved to this thread.
                  </p>
                  <Button variant="hero" onClick={handleReply} disabled={sendReply.isPending || !reply.trim()}>
                    {sendReply.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminSupport;
