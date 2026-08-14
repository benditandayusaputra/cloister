<script lang="ts">
	import type { FeedItem } from '$lib/server/feed.ts';
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';
	import { geometri, pinOf } from '$lib/utils/kertas.ts';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		item: FeedItem;
	}
	let { item }: Props = $props();

	const g = $derived(geometri(item.id));
	const tautan = $derived(
		item.isAnonymous || !item.penName ? `/baca/entri/${item.id}` : `/baca/@${item.penName}/${item.slug}`
	);
</script>

<article
	class="kertas angkat"
	style="--kertas:{g.paper};background-image:var(--paper-fill), linear-gradient({g.paper},{g.paper});position:relative;padding:var(--s-5);transform:rotate({g.rot /
		2}deg);transition:transform var(--dur-fast) var(--ease-lift), box-shadow var(--dur-fast) var(--ease-lift);display:flex;flex-direction:column;gap:var(--s-3)"
>
	<span
		aria-hidden="true"
		style="position:absolute;right:0;bottom:0;width:26px;height:26px;background:linear-gradient(45deg, rgb(0 0 0 / 0.18) 50%, rgb(255 255 255 / 0.35) 50%)"
	></span>

	<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
		<span style="width:13px;height:13px;border-radius:var(--r-pin);background:{pinOf(item.mood)};box-shadow:1px 1px 0 rgb(0 0 0 / 0.25)"></span>
		<span class="t-data t-data-ink" style="display:inline-flex;align-items:center;gap:4px">
			{item.isAnonymous || !item.penName ? i18n.t.publik.anonim : item.penName}
			{#if item.terverifikasi}<CentangTerverifikasi ukuran={13} />{/if}
		</span>
		<span class="t-data t-data-ink">{stempelTanggal(item.entryDate, i18n.locale)}</span>
	</div>

	<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg);line-height:1.1">
		<a href={tautan} style="color:inherit;text-decoration:none">{item.title}</a>
	</h2>

	<p
		style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink-soft);overflow:hidden;max-height:5.2em;text-wrap:pretty"
	>
		{item.excerpt}
	</p>

	<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
		{#each item.tags.slice(0, 3) as t (t)}
			<a href="/baca?tag={encodeURIComponent(t)}" class="tag-cip" style="text-decoration:none">{t}</a>
		{/each}
		{#if item.reactionCount > 0}
			<span class="t-data t-data-ink" style="margin-left:auto">{item.reactionCount} reaksi</span>
		{/if}
	</div>
</article>
