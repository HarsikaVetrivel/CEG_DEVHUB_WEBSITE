declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      role: 'STUDENT' | 'ADMIN';
    };
    csrfToken?: string;
  }
}

export {};
