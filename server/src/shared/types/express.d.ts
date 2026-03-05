declare namespace Express {
  interface PlatformAuthUser {
    teamMemberId: string;
    merchantId: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    status: string;
    workspaceMode: "test" | "live";
  }

  interface Request {
    rawBody?: string;
    platformAuthUser?: PlatformAuthUser;
  }
}
