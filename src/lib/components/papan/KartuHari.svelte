<script lang="ts">
	import Paku from './Paku.svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { geometri } from '$lib/utils/kertas.ts';
	import { namaHari, parseIso } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { plainTeks } from '$lib/utils/teks.ts';

	interface Props {
		entri: LocalEntry;
		x?: number | null;
		y?: number | null;
		z?: number;
		lift?: number;
		redup?: number;
		delay?: number;
		washi?: boolean;
		sisi?: 'flex-start' | 'flex-end' | null;
		tagAktif?: string | null;
		penuh?: boolean;
		onbuka: (id: string) => void;
		ontagmasuk?: (tag: string, id: string) => void;
		ontagkeluar?: () => void;
	}

	let {
		entri,
		x = null,
		y = null,
		z = 2,
		lift = 0,
		redup = 1,
		delay = 0,
		washi = false,
		sisi = null,
		tagAktif = null,
		penuh = false,
		onbuka,
		ontagmasuk,
		ontagkeluar
	}: Props = $props();

	const g = $derived(geometri(entri.entryDate + entri.id.slice(-4), tema.reduceMotion));
	const hari = $derived(parseIso(entri.entryDate).day);
	const namaSingkat = $derived(namaHari(entri.entryDate, i18n.locale).slice(0, 3));
	const cuplikan = $derived(
		(entri.title ? entri.title + '. ' : '') + plainTeks(entri.body)
	);
	const posisi = $derived(
		x === null || y === null
			? `position:relative;width:${penuh ? '100%' : '78%'};align-self:${sisi ?? 'flex-start'}`
			: `position:absolute;left:${x}px;top:${y}px;width:var(--card-w);z-index:${z}`
	);
</script>

<li style={posisi}>
	<div style="animation:bd-drop var(--dur-slow) var(--ease-pin) {delay}ms both">
		<Paku mood={entri.mood} geser={g.pinShift} berkedip={entri.conflictOf !== null} />

		{#if washi}
			<span
				aria-hidden="true"
				class="washi"
				style="position:absolute;left:26px;top:-14px;z-index:3;width:78px;height:26px;transform:rotate(-4deg)"
			></span>
		{/if}

		<article
			class="kartu-papan"
			style="position:relative;--kertas:{g.paper};transform:translateY({lift}px) rotate({g.rot}deg);opacity:{redup};{x ===
			null
				? 'min-height:120px'
				: 'height:var(--card-h)'}"
		>
			<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
				<span class="t-hand" style="font-size:2.5rem;line-height:0.82">{hari}</span>
				<span style="display:inline-flex;align-items:center;gap:6px">
					{#if entri.publicId}
						<span class="lencana-terbit" title="Sudah terbit di halaman publik" aria-label="Sudah terbit di halaman publik">
							<Ikon nama="tunas" ukuran={11} tebal={2.2} />
						</span>
					{/if}
					{#if entri.pinned}
						<span class="lencana-semat" title="Tersemat" aria-label="Tersemat">
							<Ikon nama="pin" ukuran={11} tebal={2.2} />
						</span>
					{/if}
					<span class="t-data t-data-ink">{namaSingkat}</span>
				</span>
			</div>

			<button
				type="button"
				data-testid="kartu-buka"
				data-tanggal={entri.entryDate}
				aria-label="{i18n.t.app.sunting} {entri.entryDate}"
				style="position:absolute;inset:0;z-index:1;border:none;background:transparent;cursor:pointer"
				onclick={() => onbuka(entri.id)}
			></button>

			<p
				style="margin:0;font-family:var(--f-read);font-size:0.92rem;line-height:1.5;color:var(--ink-soft);flex:1;overflow:hidden;max-height:4.5em"
			>
				{cuplikan || i18n.t.app.placeholderTulis}
			</p>

			<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
				{#each entri.tags.slice(0, 3) as tag (tag)}
					<button
						type="button"
						style="position:relative;z-index:2"
						class="tag-cip {tagAktif === tag ? 'tag-cip-aktif' : ''}"
						onmouseenter={() => ontagmasuk?.(tag, entri.id)}
						onmouseleave={() => ontagkeluar?.()}
						onfocus={() => ontagmasuk?.(tag, entri.id)}
						onblur={() => ontagkeluar?.()}
						onclick={(e) => e.stopPropagation()}
					>
						{tag}
					</button>
				{/each}
				{#if entri.attachments.length > 0}
					<span
						aria-label={i18n.t.app.lampiran}
						title={i18n.t.app.lampiran}
						style="margin-left:auto;width:13px;height:13px;border:1.75px solid var(--ink-faint);border-radius:2px 2px 2px 6px"
					></span>
				{/if}
			</div>
		</article>
	</div>
</li>

<style>
	.lencana-terbit {
		display: inline-grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--ok);
		color: #f6f2e6;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
	}
	.lencana-semat {
		display: inline-grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--pin-mood-1);
		color: #f6ecd9;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
	}
</style>
