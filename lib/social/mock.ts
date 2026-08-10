import type { SocialProvider } from "@/lib/social/types";

export class MockSocialProvider implements SocialProvider {
  async post() {
    return { id: `mock_${crypto.randomUUID()}` };
  }
  async updateBio() {}
  async updateDisplayName() {}
}
