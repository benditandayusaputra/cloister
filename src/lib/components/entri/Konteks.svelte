<script lang="ts">
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { ambilPosisi, ambilCuaca, labelCuaca, bulatkanKoordinat } from '$lib/utils/cuaca.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		entri: LocalEntry;
		onubah: (patch: Partial<LocalEntry>) => void;
	}

	let { entri, onubah }: Props = $props();
	let sibuk = $state(false);
	let label = $state('');

	async function tambah() {
		sibuk = true;
		try {
			const pos = await ambilPosisi();
			const lat = bulatkanKoordinat(pos.coords.latitude);
			const lon = bulatkanKoordinat(pos.coords.longitude);
			const hasil = await ambilCuaca(lat, lon);
			onubah({
				location: { lat, lon, label: label.trim() || `${lat}, ${lon}` },
				...('cuaca' in hasil ? { weather: hasil.cuaca } : {})
			});
			toast.show(
				'cuaca' in hasil
					? 'Lokasi dan cuaca ditambahkan. Keduanya ikut terenkripsi.'
					: `Lokasi ditambahkan, tapi cuacanya gagal diambil: ${hasil.alasan.toLowerCase()}.`
			);
		} catch (err) {
			toast.bahaya((err as Error).message || 'Izin lokasi ditolak');
		} finally {
			sibuk = false;
		}
	}
</script>

<div style="display:flex;align-items:flex-start;gap:var(--s-5);flex-wrap:wrap">
	<span class="t-data t-data-ink" style="padding-top:6px">Konteks</span>

	<div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:8px">
		{#if entri.location || entri.weather}
			<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
				{#if entri.location}
					<span class="tag-cip" style="min-height:28px;padding:0 10px;cursor:default">
						{entri.location.label}
					</span>
				{/if}
				{#if entri.weather}
					<span class="tag-cip" style="min-height:28px;padding:0 10px;cursor:default">
						{labelCuaca(entri.weather.code, i18n.locale)} · {entri.weather.tempC}°C
					</span>
				{/if}
				<button
					type="button"
					style="cursor:pointer;border:none;background:transparent;color:var(--danger);font-size:14px"
					aria-label="Hapus lokasi dan cuaca"
					onclick={() => onubah({ location: null, weather: null })}>&times;</button
				>
			</div>
		{:else}
			<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
				<input
					type="text"
					bind:value={label}
					placeholder="Nama tempat (opsional)"
					aria-label="Nama tempat"
					style="min-height:32px;width:170px;border:none;border-bottom:1px dashed rgb(27 27 23 / 0.35);background:transparent;font-family:var(--f-display);font-size:var(--text-xs);color:var(--ink);outline:none"
				/>
				<button
					type="button"
					class="tag-cip"
					style="min-height:32px;padding:0 12px"
					disabled={sibuk}
					onclick={tambah}
				>
					{sibuk ? i18n.t.umum.memuat : '+ lokasi & cuaca'}
				</button>
			</div>
		{/if}
	</div>
</div>
