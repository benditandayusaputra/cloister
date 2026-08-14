<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import { crypto } from '$crypto/client.ts';
	import { isWord, parsePhrase } from '$crypto/recovery.ts';
	import { api } from '$lib/api/client.ts';
	import type { KdfDto } from '$lib/api/endpoints.ts';
	import { toKdfParams } from '$lib/api/endpoints.ts';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Arsip {
		id: string;
		keyVersion: number;
		jumlahEntri: number;
		createdAt: string;
		purgeAfter: string;
		recoveryWrappedMk: string;
		recoveryNonce: string;
		recoverySalt: string;
		kdf: KdfDto;
	}

	interface EntriArsip {
		id: string;
		entryDate: string;
		ciphertext: string;
		nonce: string;
		wrappedDek: string;
		dekNonce: string;
		sizeBucket: number;
		rev: number;
		clientUpdatedAt: string;
	}

	let daftar = $state<Arsip[]>([]);
	let kata = $state<string[]>(new Array(24).fill(''));
	let buka = $state(false);
	let sibuk = $state(false);
	let maju = $state({ selesai: 0, total: 0 });

	const semuaValid = $derived(kata.every((w) => isWord(w)));
	const sisaHari = (iso: string) =>
		Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

	onMount(muat);

	async function muat() {
		try {
			daftar = (await api<{ arsip: Arsip[] }>('/api/arsip')).arsip;
		} catch {
			daftar = [];
		}
	}

	function tempel(i: number, e: ClipboardEvent) {
		const kataTempel = parsePhrase(e.clipboardData?.getData('text') ?? '');
		if (kataTempel.length < 2) return;
		e.preventDefault();
		const next = [...kata];
		for (let k = 0; k < kataTempel.length && i + k < 24; k++) next[i + k] = kataTempel[k] as string;
		kata = next;
	}

	async function pulihkan(a: Arsip) {
		if (!semuaValid || sibuk) return;
		sibuk = true;
		maju = { selesai: 0, total: a.jumlahEntri };
		try {
			await crypto.bukaArsip(
				kata.map((w) => w.trim().toLowerCase()),
				a.recoverySalt,
				a.recoveryWrappedMk,
				a.recoveryNonce,
				toKdfParams(a.kdf)
			);

			let since = 0;
			let total = 0;
			for (let putaran = 0; putaran < 200; putaran++) {
				const res = await api<{ entries: EntriArsip[]; hasMore: boolean }>(
					`/api/arsip/entri?since=${since}&limit=50`
				);
				if (res.entries.length === 0) break;

				const batch = [];
				for (const e of res.entries) {
					since = Math.max(since, e.rev);
					try {
						const hasil = await crypto.pindahkanArsip(e.id, {
							ciphertext: e.ciphertext,
							nonce: e.nonce,
							wrappedDek: e.wrappedDek,
							dekNonce: e.dekNonce,
							sizeBucket: e.sizeBucket as never
						});
						const tags = await crypto.tagTokens(hasil.payload.tags ?? []);
						batch.push({
							id: e.id,
							entryDate: e.entryDate,
							...hasil.parts,
							tagTokens: tags,
							clientUpdatedAt: e.clientUpdatedAt,
							baseRev: e.rev
						});
						maju = { ...maju, selesai: maju.selesai + 1 };
					} catch {
						// Entri dari arsip lain yang katanya berbeda; lewati saja.
					}
				}

				if (batch.length > 0) {
					const r = await api<{ dipulihkan: number }>('/api/arsip/entri', {
						method: 'POST',
						body: { entries: batch }
					});
					total += r.dipulihkan;
				}
				if (!res.hasMore) break;
			}

			await crypto.tutupArsip();
			await muat();
			await sync.jalankan();
			await entri.segarkan();

			kata = new Array(24).fill('');
			buka = false;
			toast.show(
				total > 0
					? `${total} tulisan lama dipulihkan.`
					: 'Tidak ada yang bisa dibuka dengan kata-kata itu.'
			);
		} catch (err) {
			await crypto.tutupArsip().catch(() => {});
			toast.bahaya(
				(err as Error).message.includes('checksum')
					? 'Checksum 24 kata tidak cocok, periksa lagi urutannya'
					: 'Kata-kata itu tidak membuka arsip ini'
			);
		} finally {
			sibuk = false;
		}
	}
</script>

{#if daftar.length > 0}
	<Kertas warna="manila" padding="var(--s-6)" kelas="kotak-warn">
		<div style="display:flex;flex-direction:column;gap:var(--s-4)">
			<h2 class="t-judul t-lg" style="color:var(--ink)">Arsip tulisan lama</h2>
			<p class="t-baca" style="max-width:62ch">
				Kamu pernah memulai dari nol. Tulisan sebelumnya masih tersimpan terenkripsi dan bisa
				diambil kembali kalau 24 kata pemulihan yang lama ketemu.
			</p>

			{#each daftar as a (a.id)}
				<div
					style="display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap;padding:var(--s-3) 0;border-top:1px solid rgb(27 27 23 / 0.14)"
				>
					<span style="font-family:var(--f-display);font-weight:600;color:var(--ink);flex:1;min-width:160px">
						{a.jumlahEntri} tulisan
					</span>
					<span class="t-data t-data-ink">
						diarsipkan {new Date(a.createdAt).toLocaleDateString()}
					</span>
					<span class="t-data" style="color:{sisaHari(a.purgeAfter) <= 7 ? 'var(--danger)' : 'var(--warn)'}">
						dibuang dalam {sisaHari(a.purgeAfter)} hari
					</span>
				</div>
			{/each}

			{#if sibuk}
				<div style="display:flex;flex-direction:column;gap:8px">
					<span class="t-data t-data-ink">
						Membuka dan memindahkan · {maju.selesai}/{maju.total}
					</span>
					<div style="width:100%;height:4px;background:rgb(27 27 23 / 0.15)">
						<div
							style="width:{maju.total ? (maju.selesai / maju.total) * 100 : 0}%;height:100%;background:var(--accent);transition:width var(--dur-base) var(--ease-quiet)"
						></div>
					</div>
				</div>
			{:else if !buka}
				<button type="button" class="tbl-garis" style="align-self:flex-start" onclick={() => (buka = true)}>
					Aku menemukan 24 katanya
				</button>
			{:else}
				<div style="display:flex;flex-direction:column;gap:var(--s-4)">
					<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--s-3)">
						{#each kata as w, i (i)}
							<label style="display:flex;align-items:baseline;gap:8px">
								<span
									style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft);min-width:16px"
									>{i + 1}</span
								>
								<input
									type="text"
									value={w}
									aria-label={i18n.t.auth.kataKe(i + 1)}
									autocomplete="off"
									autocapitalize="none"
									spellcheck="false"
									style="width:100%;min-height:40px;border:none;border-bottom:2px solid {w
										? isWord(w)
											? 'var(--ok)'
											: 'var(--danger)'
										: 'rgb(27 27 23 / 0.45)'};background:transparent;font-family:var(--f-data);font-size:var(--text-sm);color:var(--ink);outline:none"
									oninput={(e) => {
										const next = [...kata];
										next[i] = (e.currentTarget as HTMLInputElement).value;
										kata = next;
									}}
									onpaste={(e) => tempel(i, e)}
								/>
							</label>
						{/each}
					</div>

					<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
						<button
							type="button"
							class="tbl"
							disabled={!semuaValid}
							onclick={() => daftar[0] && pulihkan(daftar[0])}>Pulihkan tulisan lama</button
						>
						<button type="button" class="tbl-garis" onclick={() => (buka = false)}>
							{i18n.t.app.batal}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</Kertas>
{/if}
