<script lang="ts">
	import KartuFeed from '$components/publik/KartuFeed.svelte';
	import SaringanFeed from '$components/publik/SaringanFeed.svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { reveal } from '$lib/utils/reveal.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function tautanHal(n: number): string {
		const p = new URLSearchParams();
		if (data.sort === 'populer') p.set('sort', 'populer');
		if (data.tagAktif) p.set('tag', data.tagAktif);
		if (data.moodAktif) p.set('mood', String(data.moodAktif));
		if (data.penulisAktif) p.set('penulis', data.penulisAktif);
		if (data.cari) p.set('q', data.cari);
		if (n > 1) p.set('hal', String(n));
		const qs = p.toString();
		return qs ? `/baca?${qs}` : '/baca';
	}

	const halaman = $derived.by(() => {
		const total = data.totalHal;
		const kini = data.hal;
		const set = new Set<number>([1, total, kini, kini - 1, kini + 1]);
		const urut = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
		const keluar: Array<number | '…'> = [];
		for (let i = 0; i < urut.length; i++) {
			const n = urut[i]!;
			const sebelumnya = urut[i - 1];
			if (sebelumnya !== undefined && n - sebelumnya > 1) keluar.push('…');
			keluar.push(n);
		}
		return keluar;
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
			gambarAktif={data.gambarAktif}
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
		{#key data.hal + (data.cari ?? '') + (data.tagAktif ?? '') + data.sort}
			<div style="columns:auto 320px;column-gap:var(--s-5)">
				{#each data.items as item, i (item.id)}
					<div
						use:reveal={{ tunda: Math.min(i, 8) * 70 }}
						style="break-inside:avoid;margin-bottom:var(--s-5)"
					>
						<KartuFeed {item} />
					</div>
				{/each}
			</div>
		{/key}
	{/if}

	{#if data.totalHal > 1}
		<nav
			aria-label="Halaman"
			style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;padding-top:var(--s-4)"
		>
			{#if data.hal > 1}
				<a
					href={tautanHal(data.hal - 1)}
					class="tbl-papan"
					style="text-decoration:none;min-width:44px"
					aria-label="Halaman sebelumnya">&larr;</a
				>
			{/if}
			{#each halaman as h, i (typeof h === 'number' ? h : `e${i}`)}
				{#if h === '…'}
					<span class="t-data" style="padding:0 6px;color:var(--ink-on-board-dim)">…</span>
				{:else}
					<a
						href={tautanHal(h)}
						class="tbl-papan {h === data.hal ? 'tbl-papan-aktif' : ''}"
						style="text-decoration:none;min-width:44px;justify-content:center"
						aria-current={h === data.hal ? 'page' : undefined}>{h}</a
					>
				{/if}
			{/each}
			{#if data.hal < data.totalHal}
				<a
					href={tautanHal(data.hal + 1)}
					class="tbl-papan"
					style="text-decoration:none;min-width:44px"
					aria-label="Halaman berikutnya">&rarr;</a
				>
			{/if}
			<span class="t-data" style="width:100%;text-align:center;color:var(--ink-on-board-dim);padding-top:6px">
				Halaman {data.hal} dari {data.totalHal} · {data.total} tulisan
			</span>
		</nav>
	{/if}
</div>
