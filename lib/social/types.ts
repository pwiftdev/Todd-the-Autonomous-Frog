export interface SocialProvider {
  post(text: string): Promise<{ id: string }>;
  updateBio(text: string): Promise<void>;
  updateDisplayName(text: string): Promise<void>;
}
