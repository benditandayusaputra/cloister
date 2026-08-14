<script lang="ts">
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import PetaLokasi from './PetaLokasi.svelte';
	import { ukuranManusia } from '$lib/lampiran/gambar.ts';
	import { waktuRelatif } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		entri: LocalEntry;
		sudahTerbit: boolean;
		onterbit: () => void;
		onbagikan: () => void;
	}

	let { entri, sudahTerbit, onterbit, onbagikan }: Props = $props();

	const totalLampiran = $derived(entri.attachments.reduce((n, a) => n + a.size, 0));
	const lampiranTeks = $derived(
		entri.attachments.length === 0
			? i18n.t.app.tidakAdaLampiran
			: `${entri.attachments.length} file, ${ukuranManusia(totalLampiran)}, terenkripsi`
	);
</script>

<aside
	class="kertas kertas-buram"
	style="display:flex;flex-direction:column;gap:var(--s-4);padding:var(--s-5)"
>
	<div style="display:flex;flex-direction:column;gap:9px">
		<span class="t-data t-data-ink">{i18n.t.app.tag}</span>
		<div style="display:flex;flex-wrap:wrap;gap:6px">
			{#each entri.tags as t (t)}
				<span class="tag-cip" style="min-height:28px;padding:0 10px;cursor:default">{t}</span>
			{:else}
				<span style="font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-faint)">—</span>
			{/each}
		</div>
	</div>

	{#if entri.location}
		<div style="padding-top:var(--s-2);border-top:1px solid rgb(27 27 23 / 0.14)">
			<PetaLokasi lokasi={entri.location} cuaca={entri.weather} />
		</div>
	{/if}

	<div
		style="display:flex;flex-direction:column;gap:9px;padding-top:var(--s-2);border-top:1px solid rgb(27 27 23 / 0.14)"
	>
		<span class="t-data t-data-ink">{i18n.t.app.lampiran}</span>
		<span style="font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-soft)"
			>{lampiranTeks}</span
		>
	</div>

	<div
		style="display:flex;flex-direction:column;gap:9px;padding-top:var(--s-2);border-top:1px solid rgb(27 27 23 / 0.14)"
	>
		<span class="t-data t-data-ink">{i18n.t.app.riwayatVersi}</span>
		<span style="font-family:var(--f-data);font-size:var(--text-xs);color:var(--ink-soft)">
			rev {entri.rev} · {waktuRelatif(entri.updatedAt, i18n.locale)}
		</span>
	</div>

	<div style="display:flex;flex-direction:column;gap:var(--s-2);margin-top:var(--s-2)">
		<button type="button" class="tbl-garis" onclick={onterbit}>
			{sudahTerbit ? 'Perbarui versi publik' : i18n.t.app.terbitkan}
		</button>
		<button type="button" class="tbl-garis" onclick={onbagikan}>Bagikan lewat tautan rahasia</button>
	</div>
</aside>
