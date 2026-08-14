<script lang="ts">
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { geometri, pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { labelTanggal, parseIso, stempelTanggal } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { urlLampiran } from '$lib/lampiran/simpan.ts';
	import { dirujukDiBadan } from '$lib/utils/markdown-aman.ts';

	interface Props {
		entri: LocalEntry;
		mobile?: boolean;
	}

	let { entri, mobile = false }: Props = $props();

	const g = $derived(geometri(entri.entryDate + entri.id.slice(-4), tema.reduceMotion));
	const hari = $derived(parseIso(entri.entryDate).day);
	let urls = $state<Record<string, string>>({});

	$effect(() => {
		for (const a of entri.attachments) {
			if (a.kind !== 'image' || urls[a.id]) continue;
			void urlLampiran(a).then((u) => {
				if (u) urls = { ...urls, [a.id]: u };
			});
		}
	});
</script>

<article
	class="kertas kertas-angkat"
	style="--kertas:{g.paper};background-image:var(--paper-fill), linear-gradient({g.paper},{g.paper});padding:{mobile
		? 'var(--s-6) var(--s-5) var(--s-5)'
		: 'var(--s-8) var(--s-8) var(--s-7)'}"
>
	<header
		style="display:flex;align-items:flex-start;gap:{mobile
			? 'var(--s-4)'
			: 'var(--s-6)'};flex-wrap:wrap;padding-bottom:var(--s-5);border-bottom:1px solid rgb(27 27 23 / 0.16)"
	>
		<span class="t-hand" style="font-size:{mobile ? '3.2rem' : 'var(--text-3xl)'};line-height:0.8"
			>{hari}</span
		>
		<div style="display:flex;flex-direction:column;gap:10px;padding-top:6px">
			<span class="t-judul" style="color:var(--ink);font-size:{mobile ? '1.2rem' : 'var(--text-lg)'}"
				>{entri.title || labelTanggal(entri.entryDate, i18n.locale)}</span
			>
			<div
				style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-soft)"
			>
				<span style="display:inline-flex;align-items:center;gap:7px">
					<span style="width:13px;height:13px;border-radius:50%;background:{pinOf(entri.mood)}"></span>
					{moodLabel(entri.mood, i18n.locale)}
				</span>
				{#if entri.weather}<span>{entri.weather.tempC}°C</span>{/if}
				{#if entri.location}<span>{entri.location.label}</span>{/if}
			</div>
		</div>
		{#if !mobile}
			<span class="stempel" style="margin-left:auto;align-self:center"
				>{stempelTanggal(entri.entryDate, i18n.locale)}</span
			>
		{/if}
	</header>

	{#if entri.conflictLabel}
		<div class="pita-peringatan" style="margin-top:var(--s-5)">{entri.conflictLabel}</div>
	{/if}

	<div style="padding-top:var(--s-6);max-width:62ch">
		{#if entri.body.trim()}
			<AmanMarkdown md={entri.body} {urls} />
		{:else}
			<p class="t-baca" style="color:var(--ink-faint)">{i18n.t.umum.tidakAda}</p>
		{/if}
	</div>

	<!-- Galeri hanya untuk lampiran yang TIDAK disisipkan ke badan tulisan;
	     yang dirujuk sudah tampil di tempat yang dipilih penulisnya. -->
	{#if entri.attachments.some((a) => a.kind === 'image' && !dirujukDiBadan(entri.body, a.id))}
		<div style="padding-top:var(--s-5);display:flex;flex-wrap:wrap;gap:10px">
			{#each entri.attachments as a (a.id)}
				{#if a.kind === 'image' && urls[a.id] && !dirujukDiBadan(entri.body, a.id)}
					<img
						src={urls[a.id]}
						alt={a.alt ?? a.name}
						style="max-width:min(260px,100%);max-height:220px;object-fit:cover;box-shadow:var(--sh-pinned);border-radius:var(--r-paper)"
					/>
				{/if}
			{/each}
		</div>
	{/if}
</article>
