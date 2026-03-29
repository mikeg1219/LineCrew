"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";

export default function ProfilePage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setBio(data.bio || "");
      if (data.avatar_url) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      }
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (!error) {
      await supabase.from("profiles").update({ avatar_url: filePath }).eq("id", user.id);
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(urlData.publicUrl);
      setMessage("Photo updated!");
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, bio }).eq("id", user.id);
    setMessage(error ? "Error saving." : "Profile saved!");
    setSaving(false);
  }

  const role = profile?.role;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0d14", paddingTop: "60px", paddingBottom: "80px" }}>
      <NavBar role={role} avatarUrl={avatarUrl} fullName={fullName} />
      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#f5b400", textTransform: "uppercase", marginBottom: "8px" }}>
            {role === "waiter" ? "Waiter" : "Customer"} Account
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#fff", fontFamily: "Georgia, serif", margin: 0 }}>My Profile</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "40px" }}>
          <div style={{ position: "relative" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "3px solid #f5b400" }} />
            ) : (
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#1e2535", border: "3px solid #f5b400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", color: "#f5b400" }}>
                {fullName ? fullName[0].toUpperCase() : "?"}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, background: "#f5b400", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px" }}>
              📷
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
          {uploading && <p style={{ color: "#f5b400", fontSize: "13px", marginTop: "8px" }}>Uploading...</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Field label="Full Name">
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle} />
          </Field>
          <Field label="Email">
            <input value={user?.email || ""} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </Field>
          <Field label="Phone Number">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          {message && <p style={{ color: "#4ade80", fontSize: "14px", textAlign: "center" }}>✓ {message}</p>}
          <button onClick={handleSave} disabled={saving} style={{ background: "#f5b400", color: "#000", fontWeight: "bold", fontSize: "16px", padding: "16px", borderRadius: "12px", border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 16px", borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)", background: "#13131f",
  color: "#e8e8e0", fontSize: "15px", outline: "none", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", color: "#666", marginBottom: "8px" }}>{label}</label>
      {children}
    </div>
  );
}
