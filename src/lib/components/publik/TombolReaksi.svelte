<script lang="ts">
	import { readApi } from '$lib/api/endpoints.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { pinOf } from '$lib/utils/kertas.ts';

	interface Props {
		id: string;
		awal: Record<string, number>;
	}
	let { id, awal }: Props = $props();

	const JENIS = [
		{ kind: 'heart', titik: pinOf(1), rot: -1.6 },
		{ kind: 'hug', titik: pinOf(3), rot: 1.4 },
		{ kind: 'relate', titik: pinOf(5), rot: -0.8 }
	] as const;

	let lokal = $state<Record<string, number> | null>(null);
	const jumlah = $derived(lokal ?? awal);
	let milikku = $state<Record<string, boolean>>({});

	async function toggle(kind: string) {
		try {
			const res = await readApi.react(id, kind);
			lokal = Object.fromEntries(res.counts.map((c) => [c.kind, c.n]));
			milikku = { ...milikku, [kind]: res.toggled === 'on' };
		} catch {
			// reaksi bukan hal kritis; diamkan kalau gagal
		}
	}
</script>

{#each JENIS as j (j.kind)}
	<button
		type="button"
		style="cursor:pointer;min-height:44px;display:inline-flex;align-items:center;gap:9px;padding:0 15px;border:1.75px solid {milikku[
			j.kind
		]
			? 'var(--thread)'
			: 'rgb(27 27 23 / 0.28)'};border-radius:var(--r-control);background:{milikku[j.kind]
			? 'rgb(168 48 43 / 0.1)'
			: 'transparent'};font-family:var(--f-hand);font-weight:600;font-size:var(--text-base);color:{milikku[
			j.kind
		]
			? 'var(--thread)'
			: 'var(--ink-soft)'};transform:rotate({j.rot}deg)"
		onclick={() => toggle(j.kind)}
	>
		<span style="width:11px;height:11px;border-radius:var(--r-pin);background:{j.titik}"></span>
		{i18n.t.publik.reaksi[j.kind]}
		{jumlah[j.kind] ?? 0}
	</button>
{/each}
