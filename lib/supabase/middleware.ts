import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/constants";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAuth = pathname.startsWith("/auth");
  const isResetPassword = pathname.startsWith("/auth/reset-password");
  const isVerifyEmail = pathname.startsWith("/auth/verify-email");

  const isProfile = pathname === "/profile";

  if ((isDashboard || isAdmin || isProfile) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isVerifyEmail || isResetPassword)) {
    return supabaseResponse;
  }

  if ((isDashboard || isAdmin || isProfile) && user) {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[middleware] profiles select:", profileErr.message);
    }

    if (!isEmailVerifiedForApp(profileErr ? null : profile, user)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verify-email";
      url.searchParams.set("pending", "1");
      if (user.email) {
        url.searchParams.set("email", user.email);
      }
      return NextResponse.redirect(url);
    }
  }

  if (isAuth && user && !isResetPassword && !isVerifyEmail) {
    const { data: authProfile, error: authProfileErr } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    if (authProfileErr) {
      console.error("[middleware] profiles select (auth):", authProfileErr.message);
    }

    const needsVerify = !isEmailVerifiedForApp(
      authProfileErr ? null : authProfile,
      user
    );

    if (needsVerify) {
      if (pathname === "/auth" || pathname === "/auth/") {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verify-email";
      url.searchParams.set("pending", "1");
      if (user.email) {
        url.searchParams.set("email", user.email);
      }
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
