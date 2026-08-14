<script lang="ts">
	import TombolReaksi from './TombolReaksi.svelte';
	import Komentar from './Komentar.svelte';
	import ModalLapor from './ModalLapor.svelte';
	import type { EntriPublikView } from '$lib/server/publik.ts';
	import { pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';

	interface Props {
		entri: EntriPublikView;
	}
	let { entri }: Props = $props();

	let lapor = $state(false);
</script>

<div style="display:flex;flex-direction:column;align-items:center;gap:var(--s-5);padding:var(--s-6) 0">
	<article
		class="kertas kertas-angkat"
		style="width:100%;max-width:760px;padding:var(--s-8) var(--s-7);clip-path:polygon(0.3% 0.4%, 22% 0.1%, 47% 0.6%, 73% 0%, 99.6% 0.5%, 100% 26%, 99.5% 52%, 100% 78%, 99.4% 99.5%, 74% 100%, 48% 99.4%, 21% 100%, 0.4% 99.5%, 0% 74%, 0.5% 47%, 0% 21%);display:flex;flex-direction:column;gap:var(--s-6)"
	>
		<header
			style="display:flex;flex-wrap:wrap;gap:var(--s-5);align-items:flex-start;justify-content:space-between;padding-bottom:var(--s-5);border-bottom:1px solid rgb(27 27 23 / 0.16)"
		>
			<div style="display:flex;flex-direction:column;gap:10px">
				{#if entri.isAnonymous || !entri.penName}
					<span class="t-data" style="color:var(--ink-soft)">{i18n.t.publik.anonim}</span>
				{:else}
					<span style="display:inline-flex;align-items:center;gap:5px">
						<a href="/baca/@{entri.penName}" class="t-data" style="color:var(--accent)"
							>{entri.penName}</a
						>
						{#if entri.terverifikasi}<CentangTerverifikasi ukuran={14} />{/if}
					</span>
				{/if}
				<h1 class="t-judul t-xl" style="color:var(--ink)">{entri.title}</h1>
				<span
					style="display:inline-flex;align-items:center;gap:8px;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-soft)"
				>
					<span style="width:12px;height:12px;border-radius:50%;background:{pinOf(entri.mood)}"></span>
					{moodLabel(entri.mood, i18n.locale)}
				</span>
			</div>
			<span class="stempel">{stempelTanggal(entri.entryDate, i18n.locale)}</span>
		</header>

		<div class="prosa" style="max-width:62ch">
			<!-- Sudah lewat DOMPurify di server sebelum dikirim. -->
			{@html entri.html}
		</div>

		<div
			style="display:flex;flex-wrap:wrap;gap:var(--s-3);align-items:center;padding-top:var(--s-5);border-top:1px solid rgb(27 27 23 / 0.16)"
		>
			<TombolReaksi id={entri.id} awal={entri.reaksi} />
			<button
				type="button"
				style="cursor:pointer;margin-left:auto;min-height:44px;padding:0 12px;border:none;background:transparent;color:var(--ink-soft);font-family:var(--f-display);font-size:var(--text-sm);text-decoration:underline;text-underline-offset:3px"
				onclick={() => (lapor = true)}>{i18n.t.publik.laporTulisan}</button
			>
		</div>

		{#if entri.tags.length > 0}
			<div style="display:flex;gap:6px;flex-wrap:wrap">
				{#each entri.tags as t (t)}
					<a href="/baca?tag={encodeURIComponent(t)}" class="tag-cip" style="text-decoration:none"
						>{t}</a
					>
				{/each}
			</div>
		{/if}
	</article>

	<Komentar entriId={entri.id} />
</div>

<ModalLapor terbuka={lapor} id={entri.id} ontutup={() => (lapor = false)} />
