import { randomBytes } from "crypto";

import { env } from "@/config/env.config";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { TeamMemberModel } from "@/features/teams/team.model";
import type {
  ActivateInviteInput,
  AuthTokenPayload,
  LoginInput,
  SignupInput,
} from "@/features/auth/auth.validation";
import { appendAuditLog } from "@/features/audit/audit.service";
import { HttpError } from "@/shared/errors/http-error";
import { createPasswordHash, verifyPasswordHash } from "@/shared/utils/password-hash";
import { signJwt } from "@/shared/utils/jwt";
import { getPermissionsForRole, normalizePermissions } from "@/shared/constants/team-rbac";

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
    workspaceMode: "test" as const,
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

function createPlaceholderAddress() {
  return `0x${randomBytes(20).toString("hex")}`;
}

export async function signupWithPassword(input: SignupInput) {
  const existingMember = await TeamMemberModel.findOne({
    email: input.email,
  }).exec();

  if (existingMember) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const now = new Date();
  const password = createPasswordHash(
    input.password,
    env.PLATFORM_AUTH_PASSWORD_ITERATIONS
  );
  const merchantAccount = createPlaceholderAddress();
  const payoutWallet = createPlaceholderAddress();

  const merchant = await MerchantModel.create({
    merchantAccount,
    payoutWallet,
    reserveWallet: null,
    name: input.company,
    supportEmail: input.email,
    billingTimezone: input.billingTimezone,
    supportedMarkets: input.supportedMarkets,
    metadataHash: "0x0",
    status: "active",
  });

  try {
    const permissions = getPermissionsForRole("owner");
    const createdMember = await TeamMemberModel.create({
      merchantId: merchant._id,
      name: input.name,
      email: input.email,
      role: "owner",
      status: "active",
      markets: input.supportedMarkets,
      permissions,
      inviteToken: null,
      inviteSentAt: null,
      lastActiveAt: now,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordUpdatedAt: now,
    });

    await appendAuditLog({
      merchantId: merchant._id.toString(),
      actor: input.name,
      action: "Created workspace",
      category: "workspace",
      status: "ok",
      target: input.email,
      detail: `${input.name} created ${input.company}.`,
      metadata: {
        role: "owner",
        supportedMarkets: input.supportedMarkets,
      },
      ipAddress: null,
      userAgent: null,
    }).catch(() => undefined);

    const user = toAuthenticatedUser(createdMember);

    return {
      ...issueAccessToken({
        teamMemberId: user.teamMemberId,
        merchantId: user.merchantId,
      }),
      user,
    };
  } catch (error) {
    await MerchantModel.deleteOne({ _id: merchant._id }).catch(() => undefined);
    throw error;
  }
}

export async function authenticateWithPassword(input: LoginInput) {
  const member = input.merchantId
    ? await TeamMemberModel.findOne({
        merchantId: input.merchantId,
        email: input.email,
      }).exec()
    : await resolveLoginMemberByEmail(input.email);

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

async function resolveLoginMemberByEmail(email: string) {
  const members = await TeamMemberModel.find({
    email,
  })
    .sort({ createdAt: 1 })
    .exec();

  if (members.length === 0) {
    return null;
  }

  if (members.length > 1) {
    throw new HttpError(
      409,
      "This email belongs to multiple workspaces. Use your invite link or ask your admin for the correct workspace."
    );
  }

  return members[0] ?? null;
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
