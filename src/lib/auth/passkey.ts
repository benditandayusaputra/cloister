import { browser } from '$app/environment';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/browser';
import { api } from '$lib/api/client.ts';

export interface PasskeyDto {
	id: string;
	nickname: string | null;
	createdAt: string;
	lastUsedAt: string | null;
}

export const didukung = () =>
	browser && typeof PublicKeyCredential !== 'undefined' && Boolean(navigator.credentials);

export const daftarPasskey = () =>
	api<{ passkeys: PasskeyDto[] }>('/api/auth/passkey/daftar', { method: 'PUT' });

/** Daftarkan passkey baru untuk akun yang sedang masuk. */
export async function tambahPasskey(nickname: string): Promise<string> {
	const opsi = await api<PublicKeyCredentialCreationOptionsJSON>('/api/auth/passkey/daftar');
	const respons = await startRegistration({ optionsJSON: opsi });
	const hasil = await api<{ id: string }>('/api/auth/passkey/daftar', {
		method: 'POST',
		body: { respons, nickname }
	});
	return hasil.id;
}

export const hapusPasskey = (id: string) =>
	api<void>(`/api/auth/passkey/daftar?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

/**
 * Faktor kedua saat masuk. Mengembalikan tiket berumur pendek, atau null kalau
 * akun ini memang tidak punya passkey.
 */
export async function verifikasiPasskey(email: string): Promise<string | null> {
	const opsi = await api<PublicKeyCredentialRequestOptionsJSON & { terdaftar: boolean }>(
		`/api/auth/passkey/masuk?email=${encodeURIComponent(email)}`,
		{ auth: false }
	);
	if (!opsi.terdaftar) return null;

	const respons = await startAuthentication({ optionsJSON: opsi });
	const hasil = await api<{ tiket: string }>('/api/auth/passkey/masuk', {
		method: 'POST',
		body: { email, respons },
		auth: false
	});
	return hasil.tiket;
}
