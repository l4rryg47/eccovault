/**
 * useSessionTimeout
 * ─────────────────────────────────────────────────────────────
 * Tracks user inactivity and signs the session out after a
 * configurable idle period.
 *
 * Design decisions:
 *  - Activity is tracked by listening to DOM events on `window`.
 *    We store the last-activity time in a ref (not state) so updates
 *    never trigger re-renders.
 *  - A single setInterval polls every CHECK_INTERVAL_MS to decide
 *    whether to warn or sign out. This is cheaper than re-scheduling
 *    a setTimeout on every mouse move.
 *  - The Supabase session is fully signed out — not just navigated
 *    away — so the JWT is invalidated server-side.
 *  - A warning toast appears 2 minutes before the hard cutoff so the
 *    user can click anywhere to reset the timer.
 *  - The hook is a no-op when there is no active user, so it is safe
 *    to call unconditionally inside both dashboard layouts.
 */

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ────────────────────────────────────────────────

/** Total idle time before forced sign-out (ms). */
export const TIMEOUT_MS = 10 * 60 * 1000;          // 3 minutes

/** How long before timeout the warning toast appears (ms). */
const WARN_BEFORE_MS = 2 * 60 * 1000;              // 2 minutes before

/** How often the interval checks elapsed idle time (ms). */
const CHECK_INTERVAL_MS = 30_000;                  // every 30 seconds

/** DOM events that count as user activity. */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

// ─── Hook ─────────────────────────────────────────────────────

export const useSessionTimeout = () => {
  const { user, logout } = useAuth();

  // Last activity timestamp — stored in a ref so it never causes a render
  const lastActivity  = useRef<number>(Date.now());
  // Track whether the warning toast has been shown for the current idle window
  const warnShown     = useRef<boolean>(false);
  // Keep a reference to the active toast ID so we can dismiss it on activity
  const warnToastId   = useRef<string | number | null>(null);

  // ── Reset activity timer ──────────────────────────────────
  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();

    // If the warning toast is showing, dismiss it
    if (warnToastId.current !== null) {
      toast.dismiss(warnToastId.current);
      warnToastId.current = null;
    }
    warnShown.current = false;
  }, []);

  // ── Handle sign-out ───────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    toast.dismiss(); // clear all toasts including the warning
    toast.error("Session expired", {
      description: "You were signed out due to 10 minutes of inactivity.",
      duration: 6000,
    });
    await logout();
  }, [logout]);

  useEffect(() => {
    // No-op if there is no logged-in user
    if (!user) return;

    // ── Attach activity listeners ─────────────────────────
    const onActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    // ── Polling interval ──────────────────────────────────
    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current;

      if (idleMs >= TIMEOUT_MS) {
        // Hard sign-out
        handleTimeout();
        return;
      }

      const msUntilTimeout = TIMEOUT_MS - idleMs;

      if (msUntilTimeout <= WARN_BEFORE_MS && !warnShown.current) {
        // Show the 2-minute warning exactly once per idle window
        warnShown.current = true;

        const minutesLeft = Math.ceil(msUntilTimeout / 60_000);

        warnToastId.current = toast.warning("Still there?", {
          description: `You'll be signed out in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} due to inactivity. Move your mouse or press any key to stay signed in.`,
          duration: WARN_BEFORE_MS,   // keep it visible until dismissal or timeout
          action: {
            label: "Stay signed in",
            onClick: () => resetTimer(),
          },
        });
      }
    }, CHECK_INTERVAL_MS);

    // ── Cleanup ───────────────────────────────────────────
    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
      if (warnToastId.current !== null) {
        toast.dismiss(warnToastId.current);
      }
    };
  }, [user, resetTimer, handleTimeout]);
};
