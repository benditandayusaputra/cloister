import Dexie, { type EntityTable } from 'dexie';
import type {
	LocalEntry,
	LocalAttachment,
	QueueItem,
	MetaRow,
	VaultRow,
	SesiRow,
	SearchRow
} from './types.ts';

export class CloisterDb extends Dexie {
	entries!: EntityTable<LocalEntry, 'id'>;
	attachments!: EntityTable<LocalAttachment, 'id'>;
	searchIndex!: EntityTable<SearchRow, 'id'>;
	syncQueue!: EntityTable<QueueItem, 'seq'>;
	meta!: EntityTable<MetaRow, 'key'>;
	vaultBlob!: EntityTable<VaultRow, 'key'>;
	sesiBrankas!: EntityTable<SesiRow, 'key'>;

	constructor(name = 'Cloister') {
		super(name);
		this.version(1).stores({
			entries: 'id, entryDate, [entryDate+id], rev, dirty, deletedAt, conflictOf',
			attachments: 'id, entryId, dirty',
			searchIndex: 'id, *tokens, entryDate',
			syncQueue: '++seq, entityType, entityId, op',
			meta: 'key',
			vaultBlob: 'key',
			sesiBrankas: 'key'
		});
	}
}

let instance: CloisterDb | null = null;

export function localDb(): CloisterDb {
	if (!instance) instance = new CloisterDb();
	return instance;
}

export async function resetLocalDb() {
	await localDb().delete();
	instance = null;
}
