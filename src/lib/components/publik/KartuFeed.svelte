<script lang="ts">
	import type { FeedItem } from '$lib/server/feed.ts';
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { geometri, pinOf } from '$lib/utils/kertas.ts';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		item: FeedItem;
		seragam?: boolean;
	}
	let { item, seragam = false }: Props = $props();

	const g = $derived(geometri(item.id));
	const tautan = $derived(
		item.isAnonymous || !item.penName ? `/baca/entri/${item.id}` : `/baca/@${item.penName}/${item.slug}`
	);
	const nama = $derived(item.isAnonymous || !item.penName ? i18n.t.publik.anonim : item.penName);
</script>

<article
	class="kartu-feed kertas angkat"
	class:seragam
	style="--kertas:{g.paper};--rot:{g.rot / 2}deg;background-image:var(--paper-fill), linear-gradient({g.paper},{g.paper})"
>
	<span aria-hidden="true" class="pin" style="background:{pinOf(item.mood)}"></span>
	<span aria-hidden="true" class="lipat"></span>

	<div class="meta">
		<span class="nama">
			{nama}
			{#if item.terverifikasi}<CentangTerverifikasi ukuran={14} />{/if}
		</span>
		<span aria-hidden="true" class="titik">·</span>
		<time datetime={item.entryDate}>{stempelTanggal(item.entryDate, i18n.locale)}</time>
	</div>

	<h2 class="t-judul judul">
		<a href={tautan}>{item.title}</a>
	</h2>

	<p class="cuplikan">{item.excerpt}</p>

	<div class="kaki">
		<div class="tag">
			{#each item.tags.slice(0, 3) as t (t)}
				<a href="/baca?tag={encodeURIComponent(t)}" class="tag-cip" style="text-decoration:none">{t}</a>
			{/each}
		</div>
		<a href={tautan} class="lanjut" aria-label="Baca selengkapnya: {item.title}">
			Baca selengkapnya
			<Ikon nama="panah-kanan" ukuran={14} />
		</a>
	</div>

	{#if item.reactionCount > 0}
		<div class="angka">
			<span><Ikon nama="pin" ukuran={13} /> {item.reactionCount} reaksi</span>
		</div>
	{/if}
</article>

<style>
	.kartu-feed {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--s-3);
		padding: var(--s-6) var(--s-5) var(--s-5);
		transform: rotate(var(--rot));
		transition:
			transform var(--dur-fast) var(--ease-lift),
			box-shadow var(--dur-fast) var(--ease-lift),
			translate var(--dur-base) var(--ease-lift);
	}
	.kartu-feed.seragam {
		height: 100%;
		min-height: 320px;
	}
	.pin {
		position: absolute;
		left: 50%;
		top: -9px;
		width: 17px;
		height: 17px;
		border-radius: 50%;
		transform: translateX(-50%);
		box-shadow:
			1px 2px 3px rgb(0 0 0 / 0.45),
			inset -2px -2px 3px rgb(0 0 0 / 0.25);
		z-index: 2;
	}
	.lipat {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 26px;
		height: 26px;
		background: linear-gradient(45deg, rgb(0 0 0 / 0.18) 50%, rgb(255 255 255 / 0.35) 50%);
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		font-family: var(--f-data);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}
	.nama {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 600;
		color: var(--ink);
	}
	.titik {
		color: var(--ink-faint);
	}
	.judul {
		color: var(--ink);
		font-size: var(--text-lg);
		line-height: 1.12;
	}
	.judul a {
		color: inherit;
		text-decoration: none;
	}
	.judul a:hover {
		color: var(--accent);
	}
	.cuplikan {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.68;
		color: var(--ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-wrap: pretty;
	}
	.kaki {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: auto;
		padding-top: 4px;
	}
	.tag {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.lanjut {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--f-display);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--accent);
		text-decoration: none;
		white-space: nowrap;
	}
	.lanjut:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.angka {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		font-family: var(--f-data);
		font-size: 0.74rem;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}
	.angka span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
