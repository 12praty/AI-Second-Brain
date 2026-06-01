import { EncryptJWT, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";
import type { BrowserContext } from "@playwright/test";

const AUTH_SECRET = "test-secret-at-least-32-chars-long-for-jwt-signing!";
const COOKIE_NAME = "authjs.session-token";

type UserShape = { id: string; email: string; name: string };

export const TEST_USER: UserShape = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
};

async function getDerivedEncryptionKey(enc: string, keyMaterial: string, salt: string): Promise<Uint8Array> {
  let length: number;
  if (enc === "A256CBC-HS512") {
    length = 64;
  } else if (enc === "A256GCM") {
    length = 32;
  } else {
    throw new Error("Unsupported JWT Content Encryption Algorithm");
  }
  const key = await hkdf("sha256", keyMaterial, salt, `Auth.js Generated Encryption Key (${salt})`, length);
  // hkdf from @panva/hkdf may return Buffer or Uint8Array
  return key as unknown as Uint8Array;
}

export async function createSessionToken(user: UserShape = TEST_USER): Promise<string> {
  const alg = "dir";
  const enc = "A256CBC-HS512";
  const salt = COOKIE_NAME;

  const encryptionSecret = await getDerivedEncryptionKey(enc, AUTH_SECRET, salt);
  const thumbprint = await calculateJwkThumbprint(
    { kty: "oct", k: base64url.encode(encryptionSecret) },
    `sha${encryptionSecret.byteLength << 3}` as "sha256" | "sha384" | "sha512"
  );

  const now = Math.floor(Date.now() / 1000);

  return await new EncryptJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    id: user.id,
    picture: null,
  })
    .setProtectedHeader({ alg, enc, kid: thumbprint })
    .setIssuedAt(now)
    .setExpirationTime(now + 86400)
    .setJti(crypto.randomUUID())
    .encrypt(encryptionSecret);
}

export async function setAuthCookie(
  context: BrowserContext,
  user: UserShape = TEST_USER
): Promise<void> {
  const token = await createSessionToken(user);
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: false,
    },
  ]);
}
