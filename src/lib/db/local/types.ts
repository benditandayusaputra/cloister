import type { AttachmentMeta } from '$crypto/protocol.ts';

export interface LocalEntry {
	id: string;
	entryDate: string;
	title: string;
	body: string;
	mood: number | null;
	tags: string[];
	weather: { code: number; tempC: number } | null;
	location: { lat: number; lon: number; label: string } | null;
	attachments: AttachmentMeta[];
	pinned: boolean;
	createdAt: string;
	updatedAt: string;

	rev: number;
	baseRev: number;
	dirty: 0 | 1;
	deletedAt: string | null;
	conflictOf: string | null;
	conflictLabel: string | null;
	publicId: string | null;
}

export interface LocalAttachment {
	id: string;
	entryId: string;
	bytes: ArrayBuffer;
	mime: string;
	name: string;
	size: number;
	dirty: 0 | 1;
	remote: 0 | 1;
}

export interface QueueItem {
	seq?: number;
	entityType: 'entry' | 'attachment';
	entityId: string;
	op: 'upsert' | 'delete';
	at: string;
}

export interface MetaRow {
	key: string;
	value: unknown;
}

export interface VaultRow {
	key: 'applock';
	salt: string;
	ct: string;
	nonce: string;
}

export interface SesiRow {
	key: 'sesi';
	cryptoKey: CryptoKey;
	iv: Uint8Array;
	ct: Uint8Array;
}

export interface SearchRow {
	id: string;
	tokens: string[];
	entryDate: string;
}
