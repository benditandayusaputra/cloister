<script lang="ts">
	import KartuFeed from '$components/publik/KartuFeed.svelte';
	import SaringanFeed from '$components/publik/SaringanFeed.svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Halaman berikutnya harus membawa saringan yang sedang aktif. */
	const tautanLanjut = $derived.by(() => {
		if (!data.nextCursor) return null;
		const p = new URLSearchParams();
		if (data.sort === 'populer') p.set('sort', 'populer');
		if (data.tagAktif) p.set('tag', data.tagAktif);
		if (data.moodAktif) p.set('mood', String(data.moodAktif));
		if (data.penulisAktif) p.set('penulis', data.penulisAktif);
		if (data.cari) p.set('q', data.cari);
		p.set('cursor', data.nextCursor);
		return `/baca?${p.toString()}`;
	});

	const kosong = $derived(
		data.cari
			? `Tidak ada tulisan publik yang memuat "${data.cari}".`
			: i18n.t.umum.tidakAda
	);
</script>

<svelte:head>
	<title>{data.cari ? `Cari "${data.cari}"` : 'Feed publik'} · Cloister</title>
	<meta
		name="description"
		content="Tulisan harian yang sengaja dibuka sendiri oleh penulisnya."
	/>
	{#if data.cari || data.moodAktif || data.tagAktif}
		<meta name="robots" content="noindex, follow" />
	{/if}
</svelte:head>

<div
	class="meja-kayu"
	style="padding:var(--s-7) var(--s-6) var(--s-8);display:flex;flex-direction:column;gap:var(--s-6)"
>
	<header style="display:flex;flex-direction:column;gap:var(--s-5)">
		<div style="display:flex;flex-direction:column;gap:8px">
			<h1 class="t-judul t-xl" style="color:#E8DFC9;line-height:1">{i18n.t.publik.feedJudul}</h1>
			<p
				style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.6;color:#BFAF92;max-width:56ch;text-wrap:pretty"
			>
				{i18n.t.publik.feedSub}
			</p>
		</div>

		<SaringanFeed
			sort={data.sort}
			tags={data.tags}
			tagAktif={data.tagAktif}
			moodAktif={data.moodAktif}
			penulisAktif={data.penulisAktif}
			cari={data.cari}
		/>
	</header>

	{#if data.items.length === 0}
		<p style="font-family:var(--f-read);color:#BFAF92">{kosong}</p>
	{:else}
		{#if data.cari}
			<p class="t-data" style="color:#BFAF92">
				{data.items.length} tulisan cocok dengan "{data.cari}"
			</p>
		{/if}
		<div style="columns:auto 320px;column-gap:var(--s-5)">
			{#each data.items as item (item.id)}
				<div style="break-inside:avoid;margin-bottom:var(--s-5)">
					<KartuFeed {item} />
				</div>
			{/each}
		</div>
	{/if}

	{#if tautanLanjut}
		<a href={tautanLanjut} class="tbl-papan" style="align-self:center;text-decoration:none">
			Lebih lama
		</a>
	{/if}
</div>
