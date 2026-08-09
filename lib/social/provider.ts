export interface SocialProvider {
  post(text: string): Promise<{ id: string }>;
  updateBio(text: string): Promise<void>;
  updateDisplayName(text: string): Promise<void>;
}

export class MockSocialProvider implements SocialProvider {
  async post() {
    return { id: `mock_${crypto.randomUUID()}` };
  }
  async updateBio() {}
  async updateDisplayName() {}
}

export const socialProvider: SocialProvider = new MockSocialProvider();
