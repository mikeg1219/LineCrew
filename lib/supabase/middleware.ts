import { needsOnboardingRedirect } from "@/lib/onboarding-progress";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/constants";
import { NextResponse, type NextRequest } from "next/server";

function isExemptFromOnboardingGuard(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/legal")) return true;
  if (pathname.startsWith("/onboarding")) return true;
  /** Sign-in and related flows must never be hijacked by onboarding redirects. */
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return true;
  return false;
}

function appendVerifyQuery(
  url: URL,
  email: string | undefined
): void {
  url.searchParams.set("pending", "1");
  if (email) url.searchParams.set("email", email);
}

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
  const isResetPassword = pathname.startsWith("/auth/reset-password");
  const isVerifyEmail = pathname.startsWith("/auth/verify-email");
  const isAuthRoot = pathname === "/auth" || pathname === "/auth/";

  if (!user) {
    if (pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
    const isAdmin = pathname.startsWith("/admin");
    const isProfile = pathname === "/profile";
    if (isAdmin || isProfile) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      /** e.g. /admin → next=/admin so sign-in can return to the portal */
      const returnTo =
        request.nextUrl.pathname + (request.nextUrl.search || "");
      url.searchParams.set("next", returnTo);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[middleware] profiles select:", profileErr.message);
    if (user && (isVerifyEmail || isResetPassword)) {
      return supabaseResponse;
    }
    return supabaseResponse;
  }

  const requiredOnboardingPath = needsOnboardingRedirect(
    profile ?? null,
    user
  );
  const onboardingComplete = requiredOnboardingPath === null;

  if (onboardingComplete && pathname.startsWith("/onboarding")) {
    const role = profile?.role;
    const url = request.nextUrl.clone();
    if (role === "customer" || role === "waiter") {
      url.pathname = `/dashboard/${role}`;
    } else {
      url.pathname = "/dashboard";
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!onboardingComplete) {
    if (isExemptFromOnboardingGuard(pathname)) {
      return supabaseResponse;
    }

    const isProtected =
      pathname.startsWith("/dashboard") ||
      pathname === "/profile" ||
      pathname.startsWith("/admin");

    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = requiredOnboardingPath;
      url.search = "";
      appendVerifyQuery(url, user.email ?? undefined);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (user && (isVerifyEmail || isResetPassword)) {
    return supabaseResponse;
  }

  if (user && isAuthRoot) {
    const url = request.nextUrl.clone();
    const role = profile?.role;
    if (role === "customer" || role === "waiter") {
      url.pathname = `/dashboard/${role}`;
    } else {
      url.pathname = "/dashboard";
    }
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
