import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSupportRequest } from "@/hooks/useSupport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SupportModalOptions {
  subject?: string;
  message?: string;
}

interface SupportContextValue {
  openSupport: (options?: SupportModalOptions) => void;
}

const SupportContext = createContext<SupportContextValue | null>(null);

export const useSupportModal = () => {
  const context = useContext(SupportContext);
  if (!context) throw new Error("useSupportModal must be used within SupportProvider");
  return context;
};

export const SupportProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const createRequest = useCreateSupportRequest();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && user?.email && !email) setEmail(user.email);
  }, [email, open, user?.email]);

  const value = useMemo<SupportContextValue>(() => ({
    openSupport: (options) => {
      setEmail(user?.email ?? "");
      setSubject(options?.subject ?? "");
      setMessage(options?.message ?? "");
      setOpen(true);
    },
  }), [user?.email]);

  const reset = () => {
    setEmail(user?.email ?? "");
    setSubject("");
    setMessage("");
  };

  const handleSubmit = () => {
    if (!email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Enter your email, subject, and message.");
      return;
    }

    createRequest.mutate(
      {
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      },
      {
        onSuccess: (result) => {
          toast.success(`Support PIN ${result.support_pin} sent to ${email.trim()}.`);
          setOpen(false);
          reset();
        },
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <SupportContext.Provider value={value}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare size={18} />
            </div>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Send us a message. We will email you a 4-digit support PIN to open your support thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-email">Email</Label>
              <Input
                id="support-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                placeholder="How can we help?"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                placeholder="Tell us what is going on..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[140px]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={createRequest.isPending}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSubmit} disabled={createRequest.isPending}>
                {createRequest.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SupportContext.Provider>
  );
};
