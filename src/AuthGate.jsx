import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";

// Mandatory sign-in gate wrapping the whole app. Two methods: Google OAuth,
// or a passwordless email + one-time-code flow (Supabase's signInWithOtp /
// verifyOtp) - no password to manage, just an emailed code the user types in.
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    setError("");
    setActionLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
      // on success the browser redirects away, so no need to clear actionLoading
    } catch (err) {
      setError(err.message || "Failed to sign in with Google. Please try again.");
      setActionLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setActionLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setCodeSent(true);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    setActionLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (err) throw err;
      // success: onAuthStateChange fires and session updates automatically
    } catch (err) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || "Failed to resend code. Please try again.");
    }
  };

  const handleUseDifferentEmail = () => {
    setCodeSent(false);
    setCode("");
    setError("");
    setResendCooldown(0);
  };

  const fullscreenMsg = (text) => (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "linear-gradient(150deg,#0a0015,#000a20)",
      color: "#fff", fontSize: 18, textAlign: "center", padding: 20,
    }}>
      {text}
    </div>
  );

  if (checkingSession) return fullscreenMsg("Loading...");
  if (!supabase) return fullscreenMsg("Authentication isn't configured for this environment.");

  if (session) {
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        {children}
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 9999,
            background: "linear-gradient(135deg,#FF8C00,#D026C8)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)", color: "#fff",
    borderRadius: 10, padding: "12px 13px", fontSize: 16,
    outline: "none", boxSizing: "border-box",
  };
  const primaryBtnStyle = (disabled) => ({
    width: "100%", marginTop: 12,
    background: disabled ? "rgba(255,140,0,0.4)" : "linear-gradient(135deg,#FF8C00,#D026C8)",
    color: "#fff", border: "none", borderRadius: 10, padding: "12px 13px",
    fontSize: 15, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(150deg,#0a0015,#000a20)", padding: 20,
    }}>
      <div style={{
        maxWidth: 420, width: "100%", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)", borderRadius: 22, padding: "28px 22px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🙏</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: "#fff" }}>Welcome to Karma33</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
            Sign in to continue your practice.
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={actionLoading}
          style={{
            width: "100%", background: "#fff", color: "#1a1a1a", border: "none",
            borderRadius: 10, padding: "12px 13px", fontSize: 15, fontWeight: 800,
            cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1,
          }}
        >
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 800, letterSpacing: 1 }}>OR</div>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
        </div>

        {!codeSent ? (
          <div>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 800, letterSpacing: 1, display: "block", marginBottom: 5 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
            <button onClick={handleSendCode} disabled={actionLoading} style={primaryBtnStyle(actionLoading)}>
              {actionLoading ? "Sending..." : "Send code"}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#fff", marginBottom: 10 }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontSize: 20 }}
            />
            <button onClick={handleVerifyCode} disabled={actionLoading || code.length !== 6} style={primaryBtnStyle(actionLoading || code.length !== 6)}>
              {actionLoading ? "Verifying..." : "Verify"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleUseDifferentEmail(); }} style={{ color: "rgba(255,255,255,0.55)" }}>
                Use a different email
              </a>
              {resendCooldown > 0 ? (
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Resend in {resendCooldown}s</span>
              ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); handleResendCode(); }} style={{ color: "#FF8C00" }}>
                  Resend code
                </a>
              )}
            </div>
          </div>
        )}

        {error && <div style={{ color: "#ff6666", fontSize: 12, marginTop: 14, textAlign: "center" }}>{error}</div>}
      </div>
    </div>
  );
}
