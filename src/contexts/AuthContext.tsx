import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { uploadKycDocuments, type KycDocument } from "@/lib/cloudinary";

// ─── Types ────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "suspended" | "frozen" | "on_hold";

export interface SignupProfileData {
  phone?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  kycDocuments?: { type: KycDocument["type"]; file: File }[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  profile_data?: Record<string, unknown> | null;
  approval_status: ApprovalStatus;
  phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  lastVerified: number | null;
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  reauth: (password: string) => Promise<{ error: string | null }>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  verifyEmailOtp: (
    email: string,
    token: string,
    profileData?: SignupProfileData,
  ) => Promise<{ error: AuthError | null }>;
  resendEmailOtp: (email: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
}

export const REAUTH_GRACE_MS = 60_000;

// ─── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
};

// ─── Provider ─────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]               = useState<User | null>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastVerified, setLastVerified] = useState<number | null>(null);
  const [isLocked, setIsLocked]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Seed state from the locally-stored session immediately so the app
    // doesn't block on the network refresh before rendering.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id).then(setProfile);
        } else {
          setProfile(null);
          setLastVerified(null);
          setIsLocked(false);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime:profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          } else if (payload.old && !payload.new) {
            setProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Refresh profile ───────────────────────────────────────

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  // ── Lock / Unlock ─────────────────────────────────────────

  const lock = () => setIsLocked(true);

  const unlock = () => {
    setLastVerified(Date.now());
    setIsLocked(false);
  };

  // ── Login ─────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setLastVerified(Date.now());
      setIsLocked(false);
    }
    return { error };
  };

  // ── Reauth ────────────────────────────────────────────────

  const reauth = async (password: string): Promise<{ error: string | null }> => {
    if (!user?.email) return { error: "No active session." };

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) {
        return { error: "Incorrect password. Please try again." };
      }
      return { error: error.message };
    }

    unlock();
    return { error: null };
  };

  // ── Signup ────────────────────────────────────────────────

  // Creates the auth user and triggers Supabase's confirmation email.
  // With `enable_confirmations = true`, no session is returned here — the user
  // must confirm via the email OTP (`verifyEmailOtp`) before they can sign in.
  // Profile/KYC persistence is deferred to `verifyEmailOtp`, because the
  // `profiles` RLS policies require an authenticated session, which only exists
  // after the OTP is verified.
  const signup = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { error };
  };

  // ── Email OTP verification ────────────────────────────────

  // Verifies the signup email OTP. On success a session is briefly created,
  // under which we persist the collected profile data + KYC documents (now that
  // RLS allows it), then sign the user back out so they return to the login
  // screen to sign in fresh.
  const verifyEmailOtp = async (
    email: string,
    token: string,
    profileData?: SignupProfileData,
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) return { error };

    const userId = data?.user?.id;
    if (userId && profileData) {
      // Upload KYC documents to Cloudinary
      let kycDocs: KycDocument[] = [];
      if (profileData.kycDocuments?.length) {
        try {
          kycDocs = await uploadKycDocuments(profileData.kycDocuments, userId);
        } catch (uploadError) {
          // Email is already confirmed; don't fail the whole flow over a
          // Cloudinary hiccup — surface it but keep going.
          console.error("KYC upload failed:", (uploadError as Error).message);
        }
      }

      const newProfileData: Record<string, unknown> = {
        phone:          profileData.phone ?? null,
        date_of_birth:  profileData.dateOfBirth ?? null,
        address_line_1: profileData.addressLine1 ?? null,
        address_line_2: profileData.addressLine2 ?? null,
        city:           profileData.city ?? null,
        state:          profileData.state ?? null,
        postal_code:    profileData.postalCode ?? null,
        country:        profileData.country ?? null,
        kyc_documents:  kycDocs,
      };

      // Upsert in case Supabase's auth trigger already created the row.
      // approval_status defaults to 'pending' in DB for new rows.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id:           userId,
          email,
          profile_data: newProfileData,
        }, { onConflict: "id" });

      if (profileError) {
        console.error("Profile creation failed:", profileError.message);
      }
    }

    // Return to the login screen — the user signs in fresh after confirming.
    await supabase.auth.signOut();

    return { error: null };
  };

  // Resends the signup confirmation OTP (e.g. user abandoned verification or
  // the code expired).
  const resendEmailOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error };
  };

  // ── Logout ────────────────────────────────────────────────

  const logout = async () => {
    await supabase.auth.signOut();
    setLastVerified(null);
    setIsLocked(false);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      lastVerified, isLocked, lock, unlock,
      refreshProfile, login, reauth, signup, verifyEmailOtp, resendEmailOtp, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
