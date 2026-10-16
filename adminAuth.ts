export const adminAuth = {
  getToken(): string | null {
    return 'open-access';
  },

  getUsername(): string | null {
    return 'Admin';
  },

  setSession(_token: string, _username: string) {
    // No-op: username & password removed
  },

  clearSession() {
    // No-op
  },

  isAuthenticated(): boolean {
    return true; // Direct access without login
  },

  async login(_username?: string, _password?: string): Promise<{ token: string; username: string }> {
    return { token: 'open-access', username: 'Admin' };
  },

  async logout(): Promise<void> {
    // No-op
  },

  async changePassword(_currentPassword?: string, _newPassword?: string): Promise<void> {
    // No-op
  },

  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    return fetch(url, init);
  },

  async uploadFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'File upload failed');
    }

    return res.json();
  },
};
