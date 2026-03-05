import { env } from "@/config/env.config";
import { TeamMemberModel } from "@/features/teams/team.model";
import type {
  ActivateInviteInput,
  AuthTokenPayload,
  LoginInput,
} from "@/features/auth/auth.validation";
import { HttpError } from "@/shared/errors/http-error";
import { createPasswordHash, verifyPasswordHash } from "@/shared/utils/password-hash";
import { signJwt } from "@/shared/utils/jwt";
import { normalizePermissions } from "@/shared/constants/team-rbac";

function toAuthenticatedUser(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  markets: string[];
  lastActiveAt?: Date | null;
}) {
  return {
    teamMemberId: document._id.toString(),
    merchantId: document.merchantId.toString(),
    name: document.name,
    email: document.email,
    role: document.role,
    status: document.status,
    permissions: normalizePermissions(document.permissions),
    markets: document.markets,
    lastActiveAt: document.lastActiveAt ?? null,
  };
}

function issueAccessToken(input: {
  teamMemberId: string;
  merchantId: string;
}) {
  const token = signJwt(
    {
      sub: input.teamMemberId,
      merchantId: input.merchantId,
    },
    {
      secret: env.PLATFORM_AUTH_JWT_SECRET,
      expiresInSeconds: env.PLATFORM_AUTH_TOKEN_TTL_SECONDS,
    }
  );

  return {
    accessToken: token,
    expiresInSeconds: env.PLATFORM_AUTH_TOKEN_TTL_SECONDS,
  };
}

export async function authenticateWithPassword(input: LoginInput) {
  const member = await TeamMemberModel.findOne({
    merchantId: input.merchantId,
    email: input.email,
  }).exec();

  if (!member) {
    throw new HttpError(401, "Invalid email or password.");
  }

  if (member.status !== "active") {
    throw new HttpError(403, "Team member is not active.");
  }

  if (!member.passwordHash || !member.passwordSalt) {
    throw new HttpError(403, "Password has not been set for this team member.");
  }

  const isPasswordValid = verifyPasswordHash({
    password: input.password,
    salt: member.passwordSalt,
    expectedHash: member.passwordHash,
    iterations: env.PLATFORM_AUTH_PASSWORD_ITERATIONS,
  });

  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  member.lastActiveAt = new Date();
  await member.save();

  const user = toAuthenticatedUser(member);

  return {
    ...issueAccessToken({
      teamMemberId: user.teamMemberId,
      merchantId: user.merchantId,
    }),
    user,
  };
}

export async function activateInvite(input: ActivateInviteInput) {
  const member = await TeamMemberModel.findOne({
    merchantId: input.merchantId,
    inviteToken: input.inviteToken,
  }).exec();

  if (!member) {
    throw new HttpError(404, "Invite token was not found.");
  }

  if (member.status !== "invited") {
    throw new HttpError(409, "Invite is no longer valid.");
  }

  const password = createPasswordHash(
    input.password,
    env.PLATFORM_AUTH_PASSWORD_ITERATIONS
  );

  member.passwordHash = password.hash;
  member.passwordSalt = password.salt;
  member.passwordUpdatedAt = new Date();
  member.status = "active";
  member.inviteToken = null;
  member.lastActiveAt = new Date();
  await member.save();

  const user = toAuthenticatedUser(member);

  return {
    ...issueAccessToken({
      teamMemberId: user.teamMemberId,
      merchantId: user.merchantId,
    }),
    user,
  };
}

export async function getAuthenticatedUser(input: AuthTokenPayload) {
  const member = await TeamMemberModel.findOne({
    _id: input.sub,
    merchantId: input.merchantId,
  }).exec();

  if (!member || member.status !== "active") {
    throw new HttpError(401, "Authenticated team member is not active.");
  }

  return toAuthenticatedUser(member);
}
