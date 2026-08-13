<script lang="ts">
	import type { TemaDef, TemaId } from '$lib/state/tema.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		def: TemaDef;
		aktif: boolean;
		onpilih: (id: TemaId) => void;
	}

	let { def, aktif, onpilih }: Props = $props();
</script>

<button
	type="button"
	aria-pressed={aktif}
	style="cursor:pointer;padding:8px;border:2px solid {aktif
		? 'var(--pin-brass)'
		: 'var(--garis-ruang)'};border-radius:var(--r-control);background:var(--isi-ruang);display:flex;flex-direction:column;gap:10px;text-align:left"
	onclick={() => onpilih(def.id)}
>
	<div
		style="height:104px;padding:11px;background-image:{def.papan};box-shadow:inset 0 2px 8px rgb(0 0 0 / 0.5);display:flex;gap:7px;align-items:flex-start"
	>
		<span style="width:30%;height:44px;background:{def.kertas[0]};box-shadow:{def.bayang};transform:rotate(-3deg)"></span>
		<span style="width:30%;height:52px;background:{def.kertas[1]};box-shadow:{def.bayang};transform:rotate(2deg)"></span>
		<span style="width:30%;height:38px;background:{def.kertas[2]};box-shadow:{def.bayang};transform:rotate(-1deg)"></span>
	</div>

	<div style="display:flex;flex-direction:column;gap:3px;padding:0 3px 3px">
		<span style="font-family:var(--f-display);font-weight:600;font-size:var(--text-base);color:var(--ink-on-board)"
			>{def.nama}</span
		>
		<span class="t-data" style="color:{aktif ? 'var(--pin-brass)' : 'var(--ink-on-board-dim)'}">
			{aktif ? i18n.t.pengaturan.dipakaiSekarang : 'siap dipakai'}
		</span>
	</div>
</button>
