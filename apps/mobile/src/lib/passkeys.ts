import { NativeModules, Platform } from 'react-native';
import { Passkey, type PasskeyCreateRequest, type PasskeyGetRequest } from 'react-native-passkey';

/** The WebAuthn credential JSON the NY Atelier API verifies. */
export type PasskeyCredential = {
  id: string;
  rawId: string;
  type: 'public-key';
  response: Record<string, unknown>;
  authenticatorAttachment?: string;
  clientExtensionResults?: Record<string, unknown>;
};

export class PasskeyCancelledError extends Error {
  constructor() { super('Passkey setup was cancelled.'); }
}

export class PasskeyFailedError extends Error {}

/**
 * Passkeys need the native module, which exists only in a development or store build.
 * The web preview and Expo Go return false here instead of crashing.
 */
export function passkeysSupported(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (!NativeModules.Passkey) return false;
  try {
    return Passkey.isSupported();
  } catch {
    return false;
  }
}

function friendlyError(error: unknown, fallback: string): Error {
  const code = typeof error === 'object' && error !== null && 'error' in error ? String((error as { error: unknown }).error) : '';
  if (code === 'UserCancelled') return new PasskeyCancelledError();
  if (code === 'NoCredentials') return new PasskeyFailedError('No NY Atelier passkey was found on this phone. Use your email or phone instead.');
  if (code === 'CredentialAlreadyExists') return new PasskeyFailedError('This phone already has a passkey for your account.');
  if (code === 'NotSupported') return new PasskeyFailedError('This phone cannot use passkeys. Use your email or phone instead.');
  if (code === 'TimedOut') return new PasskeyFailedError('The passkey request timed out. Please try again.');
  return new PasskeyFailedError(fallback);
}

export async function createPasskey(options: PasskeyCreateRequest): Promise<PasskeyCredential> {
  try {
    const result = await Passkey.create(options);
    return { ...result, rawId: result.rawId || result.id, type: 'public-key', response: result.response } as PasskeyCredential;
  } catch (error) {
    throw friendlyError(error, 'We could not set up a passkey on this phone. Please try again.');
  }
}

export async function getPasskey(options: PasskeyGetRequest): Promise<PasskeyCredential> {
  try {
    const result = await Passkey.get(options);
    return { ...result, rawId: result.rawId || result.id, type: 'public-key', response: result.response } as PasskeyCredential;
  } catch (error) {
    throw friendlyError(error, 'We could not sign you in with a passkey. Use your email or phone instead.');
  }
}
