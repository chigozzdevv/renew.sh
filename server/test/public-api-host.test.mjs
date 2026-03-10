import test from "node:test";
import assert from "node:assert/strict";

import {
  getPublicApiHostForRuntimeMode,
  inferPublicApiRuntimeModeFromHost,
  normalizeRequestHost,
} from "../dist/shared/utils/public-api-host.js";

test("normalizes request hosts with ports, dots, and forwarded lists", () => {
  assert.equal(normalizeRequestHost("API.RENEW.SH:443"), "api.renew.sh");
  assert.equal(normalizeRequestHost("sandbox.renew.sh."), "sandbox.renew.sh");
  assert.equal(
    normalizeRequestHost("sandbox.renew.sh:443, internal.render.com"),
    "sandbox.renew.sh"
  );
});

test("infers runtime mode for known public Renew API hosts", () => {
  assert.equal(inferPublicApiRuntimeModeFromHost("api.renew.sh"), "live");
  assert.equal(inferPublicApiRuntimeModeFromHost("sandbox.renew.sh"), "test");
  assert.equal(inferPublicApiRuntimeModeFromHost("renew-sh.onrender.com"), null);
  assert.equal(inferPublicApiRuntimeModeFromHost("localhost:3001"), null);
});

test("maps runtime mode back to the correct public API host", () => {
  assert.equal(getPublicApiHostForRuntimeMode("live"), "api.renew.sh");
  assert.equal(getPublicApiHostForRuntimeMode("test"), "sandbox.renew.sh");
});
