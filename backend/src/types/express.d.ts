declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'STUDENT' | 'ADMIN';
      };
      csrfToken?: string;
    }
  }
}

export {};
