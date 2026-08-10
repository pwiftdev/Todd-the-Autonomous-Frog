import type { SocialProvider } from "@/lib/social/types";

/**
 * Minimal X (Twitter) provider stub.
 * Requires OAuth 1.0a user-context credentials in env.
 * Posts via the v2 tweets endpoint when fully configured.
 */
export class XSocialProvider implements SocialProvider {
  async post(text: string): Promise<{ id: string }> {
    const key = process.env.X_API_KEY;
    const secret = process.env.X_API_SECRET;
    const token = process.env.X_ACCESS_TOKEN;
    const tokenSecret = process.env.X_ACCESS_SECRET;
    if (!key || !secret || !token || !tokenSecret) {
      throw new Error("X credentials are incomplete.");
    }

    // Dry-run / staging safety: without X_LIVE=1 we only simulate delivery.
    if (process.env.X_LIVE !== "1") {
      return { id: `x_dryrun_${crypto.randomUUID()}` };
    }

    // Real signing/posting can be swapped in without changing callers.
    // Keeping the network call behind X_LIVE avoids accidental public posts.
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error(`X post failed with ${response.status}`);
    }
    const body = (await response.json()) as { data?: { id?: string } };
    if (!body.data?.id) throw new Error("X post response missing id.");
    return { id: body.data.id };
  }

  async updateBio() {
    throw new Error("Bio updates require a stricter allowlist path.");
  }

  async updateDisplayName() {
    throw new Error("Display name updates require a stricter allowlist path.");
  }
}
