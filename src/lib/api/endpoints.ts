import { api } from './client.ts';
import type { KdfParams } from '$crypto/kdf.ts';

export interface KdfDto {
	algo: 'argon2id';
	memKib: number;
	time: number;
	parallel: 1;
}

export interface SessionInfo {
	userId: string;
	email: string;
	role: string;
	emailVerified: boolean;
	hardenedMode: boolean;
	syncRev: number;
	deviceId: string | null;
	deletionScheduledAt: string | null;
	kdf: KdfDto;
	profile: {
		penName: string | null;
		displayName: string | null;
		bio: string | null;
		avatarUrl: string | null;
		theme: string;
		mode: string;
		locale: string;
		paranoidTags: boolean;
	};
	wrappedMk?: string;
	mkNonce?: string;
}

export const authApi = {
	params: (email: string) =>
		api<{ saltUser: string; kdf: KdfDto }>(`/api/auth/params?email=${encodeURIComponent(email)}`, {
			auth: false
		}),

	reset: (body: Record<string, unknown>) =>
		api<{ userId: string; deviceId: string; accessToken: string; syncRev: number }>(
			'/api/auth/reset',
			{ method: 'POST', body, auth: false }
		),

	register: (body: Record<string, unknown>) =>
		api<{ userId: string; deviceId: string; accessToken: string }>('/api/auth/register', {
			method: 'POST',
			body,
			auth: false
		}),

	login: (body: {
		email: string;
		authKey: string;
		deviceId?: string;
		deviceName?: string;
		platform?: string;
		tiketPasskey?: string;
		captcha?: unknown;
		situs?: string;
	}) =>
		api<{
			userId: string;
			accessToken: string;
			deviceId: string | null;
			deviceRegistered: boolean;
			hardenedMode: boolean;
			emailVerified: boolean;
			syncRev: number;
			wrappedMk?: string;
			mkNonce?: string;
		}>('/api/auth/login', { method: 'POST', body, auth: false }),

	logout: () => api<void>('/api/auth/logout', { method: 'POST' }),

	session: () => api<SessionInfo>('/api/auth/session'),

	verifyEmail: (code: string) => api<void>('/api/auth/verify-email', { method: 'POST', body: { code } }),

	resendCode: () => api<{ sent: boolean }>('/api/auth/verify-email', { method: 'PUT' }),

	changePassword: (body: Record<string, unknown>) =>
		api<void>('/api/auth/change-password', { method: 'POST', body }),

	rotateRecoveryPhrase: (body: Record<string, unknown>) =>
		api<void>('/api/auth/recovery-phrase', { method: 'POST', body }),

	recover: (email: string) =>
		api<{
			recoveryWrappedMk: string;
			recoveryNonce: string;
			recoverySalt: string;
			kdf: KdfDto;
		}>('/api/auth/recover', { method: 'POST', body: { email }, auth: false })
};

export interface RemoteEntry {
	id: string;
	entryDate: string;
	ciphertext: string;
	nonce: string;
	wrappedDek: string;
	dekNonce: string;
	sizeBucket: number;
	rev: number;
	clientUpdatedAt: string;
	deletedAt: string | null;
	tagTokens: string[];
}

export interface PushResult {
	id: string;
	status: 'ok' | 'conflict';
	rev: number;
	server?: RemoteEntry;
}

export const syncApi = {
	pull: (since: number, limit = 200, sejakTanggal?: string) =>
		api<{ entries: RemoteEntry[]; serverRev: number; hasMore: boolean }>(
			`/api/sync/pull?since=${since}&limit=${limit}` +
				(sejakTanggal ? `&sejakTanggal=${sejakTanggal}` : '')
		),

	push: (entries: unknown[]) =>
		api<{ results: PushResult[]; serverRev: number }>('/api/sync/push', {
			method: 'POST',
			body: { entries }
		}),

	remove: (id: string) => api<{ id: string; rev: number }>(`/api/sync/entries/${id}`, { method: 'DELETE' }),

	uploadAttachment: (form: FormData) =>
		api<{ id: string; sizeBytes: number }>('/api/sync/attachments', { method: 'POST', body: form }),

	downloadAttachment: (id: string) =>
		api<Response>(`/api/sync/attachments/${id}`, { raw: true })
};

export interface DeviceDto {
	id: string;
	name: string;
	platform: string | null;
	registeredVia: string;
	lastSeenAt: string | null;
	lastSyncedRev: number;
	isCurrent: boolean;
}

export const deviceApi = {
	list: () => api<{ devices: DeviceDto[] }>('/api/devices'),

	revoke: (id: string) => api<void>(`/api/devices/${id}`, { method: 'DELETE' }),

	createTransfer: (blob: string, nonce: string) =>
		api<{ sessionId: string; expiresAt: string; ttlSec: number }>('/api/devices/transfer', {
			method: 'POST',
			body: { blob, nonce }
		}),

	fetchTransfer: (sessionId: string) =>
		api<{ blob: string; nonce: string; attemptsLeft: number; expiresAt: string }>(
			`/api/devices/transfer/${sessionId}`
		),

	confirmTransfer: (sessionId: string, deviceName: string, platform: string) =>
		api<{ deviceId: string; accessToken: string }>(`/api/devices/transfer/${sessionId}/confirm`, {
			method: 'POST',
			body: { deviceName, platform }
		})
};

export interface PublicEntryDto {
	id: string;
	slug: string;
	title: string;
	entryDate: string;
	penName: string | null;
	isAnonymous: boolean;
	visibility: string;
	moderationState: string;
	viewCount: number;
	reactionCount: number;
	sourceEntryId: string | null;
	publishedAt: string;
}

export const publishApi = {
	list: () => api<{ entries: PublicEntryDto[] }>('/api/publish'),

	create: (body: Record<string, unknown>) =>
		api<{ id: string; slug: string; penName: string | null; url: string; moderationState: string }>(
			'/api/publish',
			{ method: 'POST', body }
		),

	update: (id: string, body: Record<string, unknown>) =>
		api<{ id: string }>(`/api/publish/${id}`, { method: 'PATCH', body }),

	remove: (id: string) => api<void>(`/api/publish/${id}`, { method: 'DELETE' })
};

export const readApi = {
	react: (id: string, kind: string) =>
		api<{ toggled: string; counts: Array<{ kind: string; n: number }> }>(`/api/baca/${id}/react`, {
			method: 'POST',
			body: { kind },
			auth: false
		}),

	reactions: (id: string) =>
		api<{ counts: Array<{ kind: string; n: number }> }>(`/api/baca/${id}/react`, { auth: false }),

	report: (id: string, reason: string, note = '') =>
		api<{ received: boolean }>(`/api/baca/${id}/report`, {
			method: 'POST',
			body: { reason, note },
			auth: false
		})
};

export const accountApi = {
	updateProfile: (body: Record<string, unknown>) =>
		api<{ profile: Record<string, unknown> }>('/api/profile', { method: 'PATCH', body }),

	enableHardened: () =>
		api<{ hardenedMode: boolean }>('/api/account/hardened', {
			method: 'POST',
			body: { confirm: 'DIPERKUAT' }
		}),

	remove: (authKey: string) =>
		api<{ scheduledAt: string }>('/api/account', { method: 'DELETE', body: { authKey } })
};

export const adminApi = {
	reports: (state = 'open') =>
		api<{
			reports: Array<{
				id: string;
				reason: string;
				note: string | null;
				state: string;
				createdAt: string;
				entryId: string;
				title: string;
				penName: string | null;
				isAnonymous: boolean;
				reportCount: number;
				moderationState: string;
			}>;
		}>(`/api/admin/reports?state=${state}`),

	act: (reportId: string, action: 'biarkan' | 'tarik') =>
		api<{ ok: boolean }>('/api/admin/reports', { method: 'POST', body: { reportId, action } })
};

export const toKdfParams = (k: KdfDto): KdfParams => ({
	algo: k.algo,
	memKib: k.memKib,
	time: k.time,
	parallel: k.parallel
});
