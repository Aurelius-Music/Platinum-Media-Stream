import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { data, error } = await fn;
    if (error) return setError(error.message);
    onAuthed(data.session);
  };

  return (
    <div style={{ padding: 12, background: "#0f0f0f", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <h4 style={{ color: "#fff", margin: 0 }}>{mode === "signin" ? "Log In" : "Sign Up"}</h4>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: 8, borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#fff" }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 8, borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#fff" }}
      />
      {error && <p style={{ color: "salmon", fontSize: 12, margin: 0 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        style={{ padding: 8, borderRadius: 6, border: "none", background: "#6c5ce7", color: "#fff", cursor: "pointer" }}
      >
        {mode === "signin" ? "Log In" : "Sign Up"}
      </button>
      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        style={{ padding: 6, borderRadius: 6, border: "1px solid #444", background: "transparent", color: "#9b8cff", fontSize: 12, cursor: "pointer" }}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>
    </div>
  );
}
