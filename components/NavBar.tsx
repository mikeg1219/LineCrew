"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  role?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
};

export function NavBar({ role, avatarUrl, fullName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const dashboardHref = role === "waiter" ? "/dashboard/waiter" : "/dashboard/customer";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(10,13,20,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: "60px", display: "flex", alignItems: "center",
        padding: "0 20px", justifyContent: "space-between",
      }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "5px", padding: "8px" }}
        >
          <span style={{ display: "block", width: "22px", height: "2px", background: menuOpen ? "#f5b400" : "#fff", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ display: "block", width: "22px", height: "2px", background: "#fff", opacity: menuOpen ? 0 : 1, transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "22px", height: "2px", background: menuOpen ? "#f5b400" : "#fff", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>

        <Link href="/" style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "18px", fontWeight: "bold", textDecoration: "none" }}>
          SaveMySpot
        </Link>

        <Link href="/profile" style={{ textDecoration: "none" }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f5b400" }} />
          ) : (
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f5b400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color: "#000" }}>
              {fullName ? fullName[0].toUpperCase() : "?"}
            </div>
          )}
        </Link>
      </nav>

      {menuOpen && (
        <div style={{ position: "fixed", top: "60px", left: 0, bottom: 0, width: "280px", background: "#0a0d14", borderRight: "1px solid rgba(255,255,255,0.08)", zIndex: 49, padding: "24px 0", display: "flex", flexDirection: "column" }} onClick={() => setMenuOpen(false)}>
          <MenuItem href="/" icon="🏠" label="Home" />
          <MenuItem href={dashboardHref} icon="📊" label="Dashboard" />
          <MenuItem href="/profile" icon="👤" label="My Profile" />
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
            <button onClick={handleSignOut} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", color: "#f87171", fontSize: "15px" }}>
              <span>🚪</span> Sign out
            </button>
          </div>
        </div>
      )}

      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 48, top: "60px" }} />}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(10,13,20,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-around", padding: "8px 0" }}>
        <BottomNavItem href="/" icon="🏠" label="Home" />
        <BottomNavItem href={dashboardHref} icon="📋" label="Dashboard" />
        <BottomNavItem href="/profile" icon="👤" label="Profile" />
      </div>
    </>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 24px", color: "#e8e8e0", textDecoration: "none", fontSize: "15px" }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>{label}
    </Link>
  );
}

function BottomNavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#888", textDecoration: "none", minWidth: "60px" }}>
      <span style={{ fontSize: "20px" }}>{icon}</span>
      <span style={{ fontSize: "10px" }}>{label}</span>
    </Link>
  );
}
