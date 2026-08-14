<script lang="ts">
	import { geometri } from '$lib/utils/kertas.ts';
	import { stempelTanggal, namaBulan } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sejak = $derived.by(() => {
		const d = new Date(data.profil.sejak);
		return `${namaBulan(d.getMonth() + 1, i18n.locale)} ${d.getFullYear()}`;
	});
</script>

<svelte:head>
	<title>{data.profil.penName} · Cloister</title>
	<meta name="description" content={data.profil.bio ?? `Tulisan publik ${data.profil.penName}`} />
</svelte:head>

<div
	class="meja-kayu"
	style="padding:var(--s-7) var(--s-6) var(--s-8);display:flex;flex-direction:column;gap:var(--s-6)"
>
	<div style="display:flex;align-items:center;gap:var(--s-5);flex-wrap:wrap">
		{#if data.profil.avatarUrl}
			<img
				src={data.profil.avatarUrl}
				alt="Foto profil {data.profil.penName}"
				style="width:72px;height:72px;object-fit:cover;box-shadow:var(--sh-contact), var(--sh-pinned);transform:rotate(-2.6deg)"
			/>
		{:else}
			<span
				style="width:72px;height:72px;display:grid;place-items:center;background-image:var(--tex-grain), linear-gradient(var(--paper-manila),var(--paper-manila));background-blend-mode:multiply,normal;box-shadow:var(--sh-contact), var(--sh-pinned);transform:rotate(-2.6deg);font-family:var(--f-hand);font-weight:600;font-size:2rem;color:var(--ink)"
				>{data.profil.penName.charAt(0).toUpperCase()}</span
			>
		{/if}
		<div style="display:flex;flex-direction:column;gap:7px">
			<h1
				class="t-judul t-xl"
				style="color:#E8DFC9;line-height:1;display:flex;align-items:center;gap:8px"
			>
				{data.profil.penName}
				{#if data.profil.terverifikasi}<CentangTerverifikasi ukuran={19} />{/if}
			</h1>
			<span class="t-data" style="color:#BFAF92"
				>{data.profil.entri.length} tulisan terbit · sejak {sejak}</span
			>
			{#if data.profil.bio}
				<p
					style="margin:0;max-width:52ch;font-family:var(--f-read);font-size:var(--text-md);line-height:1.6;color:#BFAF92"
				>
					{data.profil.bio}
				</p>
			{/if}
		</div>
	</div>

	{#if data.profil.entri.length === 0}
		<p style="font-family:var(--f-read);color:#BFAF92">{i18n.t.umum.tidakAda}</p>
	{:else}
		<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:var(--s-5)">
			{#each data.profil.entri as e (e.id)}
				{@const g = geometri(e.id)}
				<article
					class="kertas"
					style="background-image:var(--paper-fill), linear-gradient({g.paper},{g.paper});padding:var(--s-5);transform:rotate({g.rot /
						2}deg);display:flex;flex-direction:column;gap:10px"
				>
					<span class="t-data t-data-ink">{stempelTanggal(e.entryDate, i18n.locale)}</span>
					<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg);line-height:1.1">
						<a href="/baca/@{data.profil.penName}/{e.slug}" style="color:inherit;text-decoration:none"
							>{e.title}</a
						>
					</h2>
					<p
						style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink-soft);overflow:hidden;max-height:3.5em"
					>
						{e.excerpt}
					</p>
				</article>
			{/each}
		</div>
	{/if}
</div>
