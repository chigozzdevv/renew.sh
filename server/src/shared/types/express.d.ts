declare namespace Express {
  interface PlatformAuthUser {
    teamMemberId: string;
    merchantId: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    status: string;
  }

  interface Request {
    rawBody?: string;
    platformAuthUser?: PlatformAuthUser;
  }
}
