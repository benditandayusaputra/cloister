<script lang="ts">
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		ringkas?: boolean;
	}
	let { ringkas = false }: Props = $props();

	const gaya = $derived.by(() => {
		switch (sync.status) {
			case 'syncing':
				return {
					fill: 'var(--accent-hi)',
					border: 'none',
					anim: 'bd-pulse 1400ms var(--ease-quiet) infinite',
					glyph: '',
					label: i18n.t.sync.menyinkronkan
				};
			case 'offline':
				return {
					fill: 'transparent',
					border: '2px solid var(--ink-faint)',
					anim: 'none',
					glyph: '',
					label: i18n.t.sync.offline
				};
			case 'error':
				return {
					fill: 'var(--danger)',
					border: 'none',
					anim: 'none',
					glyph: '!',
					label: i18n.t.sync.gagal
				};
			default:
				return {
					fill: 'var(--ok)',
					border: 'none',
					anim: 'none',
					glyph: '',
					label: i18n.t.sync.tersinkron
				};
		}
	});
</script>

<button
	type="button"
	class={ringkas ? 'tbl-ikon' : 'tbl-papan'}
	style={ringkas ? '' : 'font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.09em;text-transform:uppercase'}
	aria-label="{i18n.t.sync.tersinkron}: {gaya.label}"
	title={sync.antre > 0 ? i18n.t.sync.antre(sync.antre) : gaya.label}
	onclick={() => sync.jalankan()}
>
	<span
		style="width:11px;height:11px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-data);font-size:8px;font-weight:600;line-height:1;color:#F3E7E4;background:{gaya.fill};border:{gaya.border};animation:{gaya.anim}"
		>{gaya.glyph}</span
	>
	{#if !ringkas}{gaya.label}{#if sync.antre > 0}&nbsp;· {sync.antre}{/if}{/if}
</button>
