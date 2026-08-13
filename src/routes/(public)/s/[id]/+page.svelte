<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import { unpad } from '$crypto/padding.ts';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Isi {
		title: string;
		body: string;
		mood: number | null;
		tags: string[];
		entryDate?: string;
	}

	let status = $state<'memuat' | 'siap' | 'gagal'>('memuat');
	let pesan = $state('');
	let isi = $state<Isi | null>(null);
	let tanggal = $state('');

	// Kunci diambil dari fragment URL, yang tidak pernah dikirim ke server.
	onMount(async () => {
		try {
			const kunciB64 = new URLSearchParams(location.hash.slice(1)).get('k');
			if (!kunciB64) throw new Error('Kunci tidak ada di tautan');

			const res = await fetch(`/api/share/${page.params.id}`);
			if (!res.ok) throw new Error('Tautan tidak berlaku atau sudah dicabut');
			const data = (await res.json()) as {
				ciphertext: string;
				nonce: string;
				entryId: string;
			};

			// libsodium dimuat lazy supaya cangkang halaman tampil dulu.
			const [{ sodium }, { open }, { fromB64Url, fromB64 }] = await Promise.all([
				import('$crypto/sodium.ts'),
				import('$crypto/aead.ts'),
				import('$crypto/bytes.ts')
			]);
			await sodium();

			const padded = await open(
				fromB64Url(kunciB64),
				fromB64(data.ciphertext),
				fromB64(data.nonce),
				data.entryId
			);
			const payload = JSON.parse(new TextDecoder().decode(unpad(padded))) as Isi & {
				createdAt?: string;
			};
			isi = payload;
			tanggal = payload.entryDate ?? (payload.createdAt ?? '').slice(0, 10);
			status = 'siap';
		} catch (err) {
			pesan = (err as Error).message;
			status = 'gagal';
		}
	});
</script>

<svelte:head>
	<title>Tulisan pribadi · Cloister</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="ruangan" style="min-height:100vh">
	<div class="shell shell-sempit" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<a
			href="/"
			style="display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink-on-board);align-self:flex-start"
		>
			<Logo />
			<span class="t-judul t-lg">Cloister</span>
		</a>

		{#if status === 'memuat'}
			<span class="t-data">{i18n.t.umum.memuat}…</span>
		{:else if status === 'gagal'}
			<div class="kertas kertas-mawar kotak-bahaya" style="padding:var(--s-6)">
				<p class="t-baca">{pesan}</p>
				<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft);margin-top:var(--s-3)">
					Tautan rahasia bisa kedaluwarsa atau dicabut penulisnya kapan saja.
				</p>
			</div>
		{:else if isi}
			<article class="kertas kertas-angkat" style="padding:var(--s-8) var(--s-7)">
				<header
					style="display:flex;flex-wrap:wrap;gap:var(--s-5);align-items:flex-start;justify-content:space-between;padding-bottom:var(--s-5);border-bottom:1px solid rgb(27 27 23 / 0.16)"
				>
					<div style="display:flex;flex-direction:column;gap:10px">
						<span class="t-data" style="color:var(--ink-soft)">Dibagikan lewat tautan rahasia</span>
						<h1 class="t-judul t-xl" style="color:var(--ink)">{isi.title || 'Tanpa judul'}</h1>
						<span
							style="display:inline-flex;align-items:center;gap:8px;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-soft)"
						>
							<span style="width:12px;height:12px;border-radius:50%;background:{pinOf(isi.mood)}"></span>
							{moodLabel(isi.mood, i18n.locale)}
						</span>
					</div>
					{#if tanggal}
						<span class="stempel">{stempelTanggal(tanggal, i18n.locale)}</span>
					{/if}
				</header>

				<div style="padding-top:var(--s-6);max-width:62ch">
					<AmanMarkdown md={isi.body} />
				</div>

				{#if isi.tags?.length}
					<div style="padding-top:var(--s-5);display:flex;gap:6px;flex-wrap:wrap">
						{#each isi.tags as t (t)}
							<span class="tag-cip" style="cursor:default">{t}</span>
						{/each}
					</div>
				{/if}
			</article>

			<p class="t-data" style="max-width:62ch;line-height:1.7">
				Tulisan ini tetap terenkripsi di server. Kuncinya ada di alamat tautan ini dan tidak pernah
				dikirim ke server, jadi kami tidak bisa membacanya.
			</p>
		{/if}
	</div>
</div>
