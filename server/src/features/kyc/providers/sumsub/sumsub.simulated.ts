import { createHmac, timingSafeEqual } from "crypto";

import { getSumsubConfig } from "@/config/sumsub.config";
import type {
  CreateSumsubAccessTokenInput,
  CreateSumsubApplicantInput,
  SumsubAccessTokenResult,
  SumsubApplicantSummary,
  SumsubProvider,
  SumsubReviewSnapshot,
  SumsubWebhookDigestInput,
} from "@/features/kyc/providers/sumsub/sumsub.types";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

type MockApplicantRecord = {
  applicantId: string;
  externalUserId: string;
  type: "individual" | "company";
  review: SumsubReviewSnapshot;
};

function safeCompareHex(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function toHexSeed(seed: string) {
  return Buffer.from(seed).toString("hex").slice(0, 24).padEnd(24, "0");
}

const mockApplicants = new Map<string, MockApplicantRecord>();

export class SumsubSimulatedProvider implements SumsubProvider {
  private readonly config: ReturnType<typeof getSumsubConfig>;

  constructor(mode: RuntimeMode = "test") {
    this.config = getSumsubConfig(mode);
  }

  async createApplicant(input: CreateSumsubApplicantInput) {
    const existing = [...mockApplicants.values()].find(
      (entry) => entry.externalUserId === input.externalUserId
    );

    if (existing) {
      return {
        applicantId: existing.applicantId,
        externalUserId: existing.externalUserId,
        type: existing.type,
        review: existing.review,
        raw: {
          id: existing.applicantId,
          externalUserId: existing.externalUserId,
          type: existing.type,
          reviewStatus: existing.review.reviewStatus,
        },
      } satisfies SumsubApplicantSummary;
    }

    const applicantId = `test-applicant-${toHexSeed(
      `${input.externalUserId}:${input.levelName}:${Date.now()}`
    )}`;
    const record: MockApplicantRecord = {
      applicantId,
      externalUserId: input.externalUserId,
      type: input.type,
      review: {
        reviewStatus: "pending",
        reviewAnswer: null,
        rejectType: null,
        rejectLabels: [],
        moderationComment: null,
        clientComment: null,
      },
    };

    mockApplicants.set(record.applicantId, record);

    return {
      applicantId: record.applicantId,
      externalUserId: record.externalUserId,
      type: record.type,
      review: record.review,
      raw: {
        id: record.applicantId,
        externalUserId: record.externalUserId,
        type: record.type,
        reviewStatus: "pending",
      },
    } satisfies SumsubApplicantSummary;
  }

  async generateSdkAccessToken(input: CreateSumsubAccessTokenInput) {
    const now = Date.now();
    const expiresAt = new Date(now + input.ttlInSeconds * 1000).toISOString();
    const tokenSeed = `${input.externalUserId}:${input.levelName}:${now}`;

    return {
      token: `test-sumsub-${toHexSeed(tokenSeed)}`,
      expiresAt,
      userId: input.externalUserId,
      raw: {
        token: `test-sumsub-${toHexSeed(tokenSeed)}`,
        expiresAt,
        userId: input.externalUserId,
      },
    } satisfies SumsubAccessTokenResult;
  }

  async getApplicantReview(applicantId: string) {
    const applicant = mockApplicants.get(applicantId);

    if (!applicant) {
      return {
        reviewStatus: "pending",
        reviewAnswer: null,
        rejectType: null,
        rejectLabels: [],
        moderationComment: null,
        clientComment: null,
        raw: {
          id: applicantId,
          reviewStatus: "pending",
        },
      };
    }

    return {
      ...applicant.review,
      raw: {
        id: applicant.applicantId,
        externalUserId: applicant.externalUserId,
        reviewStatus: applicant.review.reviewStatus,
        reviewResult: {
          reviewAnswer: applicant.review.reviewAnswer,
          reviewRejectType: applicant.review.rejectType,
          rejectLabels: applicant.review.rejectLabels,
          moderationComment: applicant.review.moderationComment,
          clientComment: applicant.review.clientComment,
        },
      },
    };
  }

  verifyWebhookDigest(input: SumsubWebhookDigestInput) {
    if (!this.config.webhookSecret) {
      return true;
    }

    if (!input.digest) {
      return false;
    }

    const algorithm = (input.algorithm ?? "HMAC_SHA256_HEX")
      .trim()
      .toUpperCase();
    const digestAlgorithm =
      algorithm === "HMAC_SHA1_HEX"
        ? "sha1"
        : algorithm === "HMAC_SHA512_HEX"
          ? "sha512"
          : algorithm === "HMAC_SHA256_HEX"
            ? "sha256"
            : null;

    if (!digestAlgorithm) {
      return false;
    }

    const expected = createHmac(digestAlgorithm, this.config.webhookSecret)
      .update(input.rawBody, "utf8")
      .digest("hex");
    const received = input.digest.trim().toLowerCase();

    return safeCompareHex(expected, received);
  }
}
