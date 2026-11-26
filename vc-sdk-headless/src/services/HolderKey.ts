// The wallet's one holder key: an Ed25519 key kept in SecureStore, used for the
// OID4VCI proof of possession AND for signing OpenID4VP presentations.
//
// Why one key: an issuer binds the credential to the key in the issuance proof
// (credentialSubject.id = that key's did:jwk), and a verifier accepts a
// presentation only when it is signed by that same holder. Signing the proof
// with one key and each presentation with a fresh one breaks that binding, and a
// verifier that checks it (as it should: otherwise anyone holding a copy of the
// credential could present it) rejects every presentation.
//
// @noble/ed25519 v2 needs SHA-512 supplied where WebCrypto is absent (Hermes);
// it is wired from @noble/hashes here, and keys come from expo-crypto.

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import * as ExpoCrypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

const STORE_KEY = 'holder_ed25519_private_key';

const b64url = (bytes: Uint8Array | string) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

export interface HolderKey {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicJwk: { kty: 'OKP'; crv: 'Ed25519'; x: string };
  /** did:jwk of the public JWK, without a fragment. */
  did: string;
  /** The verification method id: `${did}#0`. */
  kid: string;
}

let cached: HolderKey | null = null;

/** The persistent holder key, created on first use. */
export async function holderKey(): Promise<HolderKey> {
  if (cached) return cached;
  let hex = await SecureStore.getItemAsync(STORE_KEY);
  if (!hex) {
    hex = Buffer.from(ExpoCrypto.getRandomBytes(32)).toString('hex');
    await SecureStore.setItemAsync(STORE_KEY, hex);
  }
  const privateKey = Uint8Array.from(Buffer.from(hex, 'hex'));
  const publicKey = ed.getPublicKey(privateKey);
  // Member order is fixed: did:jwk is the base64url of this exact JSON, and the
  // issuer derives the credential subject from the same string.
  const publicJwk = { kty: 'OKP' as const, crv: 'Ed25519' as const, x: b64url(publicKey) };
  const did = `did:jwk:${b64url(JSON.stringify(publicJwk))}`;
  cached = { privateKey, publicKey, publicJwk, did, kid: `${did}#0` };
  return cached;
}

/** Signs bytes with the holder key. */
export async function holderSign(message: Uint8Array): Promise<Uint8Array> {
  return ed.sign(message, (await holderKey()).privateKey);
}

/**
 * An OID4VCI proof JWT (typ openid4vci-proof+jwt, alg EdDSA) signed with the
 * holder key, naming it both as `kid` (did:jwk) and as the inline `jwk`.
 */
export async function holderProofJwt(payload: Record<string, unknown>): Promise<string> {
  const key = await holderKey();
  const header = { alg: 'EdDSA', typ: 'openid4vci-proof+jwt', kid: key.kid, jwk: key.publicJwk };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = await holderSign(Buffer.from(signingInput));
  return `${signingInput}.${b64url(signature)}`;
}
