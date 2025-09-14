import { updateSession } from "@/lib/supabase/middleware";
import { DeepLinkHandler } from "@/lib/services/DeepLinkHandler";
import { validateRedirectUrl } from "@/lib/utils/url-validation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const deepLinkHandler = new DeepLinkHandler();

  // Extract and validate deep link parameters
  const redirectParam = url.searchParams.get("redirect");
  const deepLinkData = deepLinkHandler.extractDeepLinkData(request);

  // Security validation for redirect URLs
  if (redirectParam) {
    const validationResult = validateRedirectUrl(redirectParam);
    if (!validationResult.isValid) {
      console.warn(
        "Invalid redirect URL blocked:",
        redirectParam,
        validationResult.reason
      );
      url.searchParams.delete("redirect");
    }
  }

  // Handle deep link routing before auth check
  if (deepLinkData.isDeepLink) {
    const routeResult = deepLinkHandler.handleDeepLinkRouting(
      deepLinkData,
      request
    );
    if (routeResult.shouldRedirect) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = routeResult.path;
      if (routeResult.searchParams) {
        routeResult.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.set(key, value);
        });
      }

      // Store deep link context for post-auth redirect
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set("deep-link-context", JSON.stringify(deepLinkData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300, // 5 minutes
      });
      return response;
    }
  }

  // Proceed with standard auth middleware
  const authResponse = await updateSession(request);

  // Inject deep link context into response headers for client access
  if (deepLinkData.isDeepLink) {
    authResponse.headers.set(
      "X-Deep-Link-Context",
      JSON.stringify({
        source: deepLinkData.source,
        params: deepLinkData.params,
        timestamp: deepLinkData.timestamp,
      })
    );
  }

  return authResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
