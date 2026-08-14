<script lang="ts">
	import Tirai from '$components/dasar/Tirai.svelte';
	import { readApi } from '$lib/api/endpoints.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		terbuka: boolean;
		id: string;
		ontutup: () => void;
	}

	let { terbuka, id, ontutup }: Props = $props();

	const ALASAN = ['spam', 'harassment', 'selfharm', 'illegal', 'other'] as const;

	let dipilih = $state<string | null>(null);
	let catatan = $state('');
	let sibuk = $state(false);

	async function kirim() {
		if (!dipilih || sibuk) return;
		sibuk = true;
		try {
			await readApi.report(id, dipilih, catatan);
			toast.show('Laporan terkirim. Terima kasih.');
			ontutup();
			dipilih = null;
			catatan = '';
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}
</script>

<Tirai {terbuka} label={i18n.t.publik.alasanLapor} bawah {ontutup}>
	<div
		class="kertas kertas-angkat"
		style="width:100%;max-width:520px;margin:0 auto;padding:var(--s-6);display:flex;flex-direction:column;gap:var(--s-4)"
	>
		<span style="width:52px;height:4px;border-radius:2px;background:rgb(27 27 23 / 0.25);align-self:center"></span>
		<h2 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.publik.alasanLapor}</h2>

		<div style="display:flex;flex-direction:column;gap:var(--s-2)">
			{#each ALASAN as a (a)}
				<button
					type="button"
					style="cursor:pointer;text-align:left;min-height:48px;padding:0 15px;border:1px solid {dipilih ===
					a
						? 'var(--accent)'
						: 'rgb(27 27 23 / 0.28)'};border-radius:var(--r-control);background:{dipilih === a
						? 'rgb(43 79 142 / 0.1)'
						: 'transparent'};color:var(--ink);font-family:var(--f-read);font-size:var(--text-md)"
					onclick={() => (dipilih = a)}>{i18n.t.publik.alasan[a]}</button
				>
			{/each}
		</div>

		<label class="label-medan">
			<span class="t-data t-data-ink">Catatan (opsional)</span>
			<textarea
				bind:value={catatan}
				maxlength="500"
				rows="2"
				style="border:none;border-bottom:2px solid rgb(27 27 23 / 0.45);background:transparent;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink);resize:vertical;outline:none"
			></textarea>
		</label>

		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
			<button type="button" class="tbl" disabled={!dipilih || sibuk} onclick={kirim}>
				{i18n.t.publik.kirimLaporan}
			</button>
			<button type="button" class="tbl-garis" onclick={ontutup}>{i18n.t.app.batal}</button>
		</div>
	</div>
</Tirai>
