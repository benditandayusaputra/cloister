<script lang="ts">
	import Tirai from '$components/dasar/Tirai.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { crypto } from '$crypto/client.ts';
	import { api } from '$lib/api/client.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		terbuka: boolean;
		entri: LocalEntry;
		ontutup: () => void;
	}

	let { terbuka, entri, ontutup }: Props = $props();

	let hariBerlaku = $state(30);
	let tautan = $state('');
	let sibuk = $state(false);

	async function buat() {
		sibuk = true;
		try {
			const parts = await crypto.encryptEntry(entri.id, {
				v: 1,
				title: entri.title,
				body: entri.body,
				mood: entri.mood,
				tags: entri.tags,
				createdAt: entri.createdAt,
				updatedAt: entri.updatedAt
			});
			const dek = await crypto.exportDek(entri.id, parts.wrappedDek, parts.dekNonce);

			const res = await api<{ id: string; path: string }>('/api/share', {
				method: 'POST',
				body: {
					entryId: entri.id,
					ciphertext: parts.ciphertext,
					nonce: parts.nonce,
					sizeBucket: parts.sizeBucket,
					hariBerlaku
				}
			});

			const kunci = dek.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
			tautan = `${location.origin}${res.path}#k=${kunci}`;
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function salin() {
		await navigator.clipboard.writeText(tautan);
		toast.show('Tautan tersalin. Kirim lewat jalur yang kamu percaya.');
	}
</script>

<Tirai {terbuka} label="Tautan rahasia" {ontutup}>
	<div
		class="kertas kertas-angkat"
		style="max-width:620px;margin:0 auto;padding:var(--s-6);display:flex;flex-direction:column;gap:var(--s-5)"
	>
		<h2 class="t-judul t-xl" style="color:var(--ink)">Bagikan lewat tautan rahasia</h2>
		<p class="t-baca" style="max-width:62ch">
			Berbeda dengan menerbitkan ke halaman publik, tulisan ini tetap terenkripsi di server. Kuncinya
			ikut di alamat tautan setelah tanda pagar, dan bagian itu tidak pernah dikirim ke server.
		</p>
		<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft);max-width:62ch">
			Siapa pun yang punya tautan lengkapnya bisa membaca. Kirim lewat jalur yang kamu percaya, dan
			cabut kalau sudah tidak perlu.
		</p>

		{#if !tautan}
			<label class="label-medan" style="max-width:220px">
				<span class="t-data t-data-ink">Berlaku berapa hari</span>
				<input type="number" bind:value={hariBerlaku} min="1" max="365" class="isian isian-data" />
			</label>

			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
				<button type="button" class="tbl" disabled={sibuk} onclick={buat}>
					{sibuk ? i18n.t.umum.memuat : 'Buat tautan'}
				</button>
				<button type="button" class="tbl-garis" onclick={ontutup}>{i18n.t.app.batal}</button>
			</div>
		{:else}
			<div
				style="padding:var(--s-4);border:1px dashed rgb(27 27 23 / 0.35);font-family:var(--f-data);font-size:var(--text-xs);line-height:1.7;color:var(--ink);word-break:break-all"
			>
				{tautan}
			</div>
			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
				<button type="button" class="tbl" onclick={salin}>Salin tautan</button>
				<button type="button" class="tbl-garis" onclick={ontutup}>{i18n.t.app.tutup}</button>
			</div>
			<span class="t-data t-data-ink">
				Kelola dan cabut tautan di Pengaturan → Catatan publik.
			</span>
		{/if}
	</div>
</Tirai>
