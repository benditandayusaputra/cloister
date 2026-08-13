import JSZip from 'jszip';
import { entriesRepo } from '$lib/db/local/repo.ts';
import { localDb } from '$lib/db/local/db.ts';
import { urlLampiran } from '$lib/lampiran/simpan.ts';
import { unduhBlob } from '$lib/utils/unduh.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

const README = `CLOISTER EXPORT
============

Berkas ini dibuat di perangkatmu dari salinan yang sudah terbuka.
Server tidak ikut memproses dan tidak pernah melihat isinya.

Isi:
  entries/   Satu berkas markdown per entri, dengan frontmatter YAML.
             Bisa langsung dibuka Obsidian atau editor teks apa pun.
  media/     Lampiran dalam bentuk plaintext.
  cloister-export.json
             Data mentah lengkap untuk diimpor ulang ke Cloister.

Format ini sengaja terbuka supaya kamu tidak terkunci di satu aplikasi.
`;

function escapeYaml(s: string): string {
	return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function keMarkdown(e: LocalEntry): string {
	const fm = [
		'---',
		`date: ${e.entryDate}`,
		e.title ? `title: ${escapeYaml(e.title)}` : null,
		e.mood !== null ? `mood: ${e.mood}` : null,
		e.tags.length ? `tags: [${e.tags.map(escapeYaml).join(', ')}]` : null,
		e.location ? `location: ${escapeYaml(e.location.label)}` : null,
		e.weather ? `weather: ${e.weather.tempC}C` : null,
		e.attachments.length
			? `attachments: [${e.attachments.map((a) => escapeYaml(`media/${a.id}-${a.name}`)).join(', ')}]`
			: null,
		`created: ${e.createdAt}`,
		`updated: ${e.updatedAt}`,
		'---',
		''
	]
		.filter((x): x is string => x !== null)
		.join('\n');
	return fm + '\n' + e.body + '\n';
}

export interface HasilEkspor {
	entri: number;
	lampiran: number;
	nama: string;
}

export async function eksporSemua(sertakanMedia = true): Promise<HasilEkspor> {
	const semua = await entriesRepo.all();
	const zip = new JSZip();
	zip.file('README.txt', README);

	const folderEntri = zip.folder('entries');
	const folderMedia = zip.folder('media');
	const dipakai = new Map<string, number>();
	let lampiran = 0;

	for (const e of semua) {
		const dasar = e.entryDate;
		const n = (dipakai.get(dasar) ?? 0) + 1;
		dipakai.set(dasar, n);
		const nama = n === 1 ? `${dasar}.md` : `${dasar}-${n}.md`;
		folderEntri?.file(nama, keMarkdown(e));

		if (!sertakanMedia) continue;
		for (const a of e.attachments) {
			const row = await localDb().attachments.get(a.id);
			if (row) {
				folderMedia?.file(`${a.id}-${a.name}`, row.bytes);
				lampiran++;
				continue;
			}
			const url = await urlLampiran(a);
			if (!url) continue;
			const blob = await (await fetch(url)).blob();
			folderMedia?.file(`${a.id}-${a.name}`, blob);
			lampiran++;
		}
	}

	zip.file(
		'cloister-export.json',
		JSON.stringify(
			{
				format: 'cloister-export',
				version: 1,
				exportedAt: new Date().toISOString(),
				entries: semua.map((e) => ({
					id: e.id,
					entryDate: e.entryDate,
					title: e.title,
					body: e.body,
					mood: e.mood,
					tags: e.tags,
					weather: e.weather,
					location: e.location,
					attachments: e.attachments,
					createdAt: e.createdAt,
					updatedAt: e.updatedAt
				}))
			},
			null,
			2
		)
	);

	const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
	const nama = `cloister-export-${new Date().toISOString().slice(0, 10)}.zip`;
	unduhBlob(nama, blob);
	return { entri: semua.length, lampiran, nama };
}
