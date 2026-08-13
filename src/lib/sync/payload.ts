import type { EntryPayload } from '$crypto/protocol.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

/** Bentuk payload yang dienkripsi. Dipakai mesin sync dan rotasi kunci. */
export function keEntryPayload(e: LocalEntry): EntryPayload {
	return {
		v: 1,
		title: e.title,
		body: e.body,
		mood: e.mood,
		tags: e.tags,
		weather: e.weather,
		location: e.location,
		attachments: e.attachments,
		createdAt: e.createdAt,
		updatedAt: e.updatedAt
	};
}
