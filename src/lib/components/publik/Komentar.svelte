<script lang="ts">
	import { onMount } from 'svelte';
	import { api, ensureFreshToken } from '$lib/api/client.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { waktuRelatif } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface KomentarDto {
		id: string;
		parentId: string | null;
		body: string;
		createdAt: string;
		penulis: boolean;
		penName: string | null;
	}

	interface Props {
		entriId: string;
	}

	let { entriId }: Props = $props();

	let daftar = $state<KomentarDto[]>([]);
	let memuat = $state(true);
	let isi = $state('');
	let balasKe = $state<KomentarDto | null>(null);
	let sibuk = $state(false);
	let masuk = $state(false);
	let penNameku = $state<string | null>(null);

	const induk = $derived(daftar.filter((k) => !k.parentId));
	const anakDari = $derived((id: string) => daftar.filter((k) => k.parentId === id));

	onMount(async () => {
		if (await ensureFreshToken()) {
			try {
				const info = await api<{ profile: { penName: string | null } }>('/api/auth/session');
				masuk = true;
				penNameku = info.profile.penName;
			} catch {
				masuk = false;
			}
		}
		try {
			daftar = (await api<{ komentar: KomentarDto[] }>(`/api/baca/${entriId}/komentar`, { auth: false }))
				.komentar;
		} catch {
			daftar = [];
		} finally {
			memuat = false;
		}
	});

	async function kirim() {
		if (!isi.trim() || sibuk) return;
		sibuk = true;
		try {
			const res = await api<{ komentar: KomentarDto }>(`/api/baca/${entriId}/komentar`, {
				method: 'POST',
				body: { body: isi.trim(), parentId: balasKe?.id ?? null }
			});
			daftar = [...daftar, res.komentar];
			isi = '';
			balasKe = null;
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function hapus(k: KomentarDto) {
		if (!confirm('Hapus komentar ini?')) return;
		try {
			await api<{ dihapus: number }>(`/api/baca/${entriId}/komentar?komentarId=${k.id}`, {
				method: 'DELETE'
			});
			daftar = daftar.filter((d) => d.id !== k.id && d.parentId !== k.id);
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}

	const bolehHapus = (k: KomentarDto) =>
		masuk && k.penName !== null && penNameku !== null && k.penName === penNameku;
</script>

{#snippet kartuKomentar(k: KomentarDto, anak: boolean)}
	<div
		class="kertas {anak ? 'kertas-buram' : ''}"
		style="padding:12px 14px;display:flex;flex-direction:column;gap:7px;{anak
			? 'margin-left:clamp(16px, 6%, 40px);'
			: ''}transform:rotate({anak ? 0.25 : -0.2}deg)"
	>
		<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
			{#if k.penName}
				<a href="/baca/@{k.penName}" class="t-data" style="color:var(--accent)">@{k.penName}</a>
			{:else}
				<span class="t-data" style="color:var(--ink-soft)">anonim</span>
			{/if}
			{#if k.penulis}
				<span
					style="padding:1px 8px;border-radius:99px;background:var(--accent);color:var(--accent-ink);font-family:var(--f-data);font-size:0.62rem;letter-spacing:0.08em;text-transform:uppercase"
					>Penulis</span
				>
			{/if}
			<span
				style="margin-left:auto;font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-faint)"
				>{waktuRelatif(k.createdAt, i18n.locale)}</span
			>
		</div>
		<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink);white-space:pre-wrap">{k.body}</p>
		<div style="display:flex;gap:10px">
			{#if masuk && !anak}
				<button
					type="button"
					class="t-data"
					style="cursor:pointer;border:none;background:none;padding:0;color:var(--ink-soft)"
					onclick={() => {
						balasKe = k;
					}}>Balas</button
				>
			{/if}
			{#if bolehHapus(k)}
				<button
					type="button"
					class="t-data"
					style="cursor:pointer;border:none;background:none;padding:0;color:var(--danger)"
					onclick={() => hapus(k)}>Hapus</button
				>
			{/if}
		</div>
	</div>
{/snippet}

<section
	aria-label="Komentar"
	style="width:100%;max-width:760px;display:flex;flex-direction:column;gap:var(--s-4)"
>
	<h2 class="t-judul t-lg" style="color:var(--ink-on-board)">
		Komentar {daftar.length ? `(${daftar.length})` : ''}
	</h2>

	{#if memuat}
		<span class="t-data" style="color:var(--ink-on-board-dim)">{i18n.t.umum.memuat}…</span>
	{:else}
		{#if daftar.length === 0}
			<p class="t-baca" style="color:var(--ink-on-board-dim);font-size:var(--text-sm)">
				Belum ada komentar. Jadilah yang pertama meninggalkan jejak di meja ini.
			</p>
		{/if}

		<div style="display:flex;flex-direction:column;gap:12px">
			{#each induk as k (k.id)}
				{@render kartuKomentar(k, false)}
				{#each anakDari(k.id) as balasan (balasan.id)}
					{@render kartuKomentar(balasan, true)}
				{/each}
			{/each}
		</div>

		{#if masuk}
			<form
				class="kertas kertas-manila"
				style="padding:var(--s-4);display:flex;flex-direction:column;gap:10px"
				onsubmit={(e) => {
					e.preventDefault();
					void kirim();
				}}
			>
				{#if balasKe}
					<div
						style="display:flex;align-items:center;gap:8px;font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft)"
					>
						Membalas {balasKe.penName ? `@${balasKe.penName}` : 'anonim'}
						<button
							type="button"
							style="cursor:pointer;border:none;background:none;color:var(--danger);font-size:14px;line-height:1"
							aria-label="Batal membalas"
							onclick={() => (balasKe = null)}>&times;</button
						>
					</div>
				{/if}
				<textarea
					bind:value={isi}
					rows="3"
					maxlength="1000"
					placeholder="Tulis komentar yang baik…"
					aria-label="Isi komentar"
					style="width:100%;resize:vertical;border:1px solid rgb(27 27 23 / 0.2);border-radius:var(--r-control);padding:10px 12px;background:var(--paper-bone);font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink)"
				></textarea>
				<div style="display:flex;align-items:center;gap:var(--s-3)">
					<button type="submit" class="tbl" disabled={sibuk || !isi.trim()} style="min-height:38px">
						{sibuk ? i18n.t.umum.memuat : balasKe ? 'Kirim balasan' : 'Kirim komentar'}
					</button>
					<span class="t-data" style="margin-left:auto;color:var(--ink-soft)">{isi.length}/1000</span>
				</div>
			</form>
		{:else}
			<div
				class="kertas kertas-buram"
				style="padding:var(--s-4);display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap"
			>
				<span class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
					Masuk dulu untuk ikut berkomentar.
				</span>
				<a href="/masuk" class="tbl-garis" style="margin-left:auto;text-decoration:none;min-height:38px"
					>Masuk</a
				>
			</div>
		{/if}
	{/if}
</section>
