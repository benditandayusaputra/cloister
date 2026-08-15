<script lang="ts">
	import type { DeviceDto } from '$lib/api/endpoints.ts';
	import { geometri } from '$lib/utils/kertas.ts';
	import { waktuRelatif } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';

	interface Props {
		perangkat: DeviceDto;
		oncabut: (id: string) => void;
	}

	let { perangkat, oncabut }: Props = $props();

	const g = $derived(geometri(perangkat.id, tema.reduceMotion));
	const lebarIkon = $derived(
		perangkat.platform === 'iOS' || perangkat.platform === 'Android' ? '14px' : '30px'
	);
	const asal = $derived(
		{ initial: 'perangkat pertama', transfer: 'lewat transfer', recovery: 'lewat 24 kata' }[
			perangkat.registeredVia
		] ?? perangkat.registeredVia
	);
</script>

<div
	class="kertas kertas-warna"
	style="--kertas:{g.paper};padding:var(--s-5);transform:rotate({g.rot /
		2}deg);display:flex;flex-direction:column;gap:var(--s-3)"
>
	<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
		<span style="width:{lebarIkon};height:22px;border:1.75px solid var(--ink-soft);border-radius:2px"></span>
		<span style="font-family:var(--f-display);font-weight:600;font-size:var(--text-base);color:var(--ink)"
			>{perangkat.name}</span
		>
		{#if perangkat.isCurrent}
			<span
				class="t-data"
				style="color:var(--ok);border:1px solid var(--ok);border-radius:var(--r-control);padding:2px 6px"
				>{i18n.t.pengaturan.perangkatIni}</span
			>
		{/if}
	</div>

	<span style="font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.06em;color:var(--ink-soft)">
		{asal} · sync rev {perangkat.lastSyncedRev} · {waktuRelatif(perangkat.lastSeenAt, i18n.locale)}
	</span>

	{#if !perangkat.isCurrent}
		<button type="button" class="tbl-bahaya" style="align-self:flex-start" onclick={() => oncabut(perangkat.id)}>
			{i18n.t.pengaturan.cabut}
		</button>
	{/if}
</div>
