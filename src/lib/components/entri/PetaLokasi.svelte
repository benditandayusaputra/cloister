<script lang="ts">
	import { onMount } from 'svelte';
	import { susunPetak, tautanOsm, UKURAN_UBIN } from '$lib/utils/peta.ts';
	import { labelCuaca } from '$lib/utils/cuaca.ts';
	import { metaRepo } from '$lib/db/local/repo.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		lokasi: { lat: number; lon: number; label: string };
		cuaca?: { code: number; tempC: number } | null;
	}

	let { lokasi, cuaca = null }: Props = $props();

	const KUNCI = 'petaDiizinkan';
	const LEBAR = 248;
	const TINGGI = 148;
	const ZOOM = 14;

	// Ubinnya diambil dari OpenStreetMap, artinya mereka melihat koordinat ini.
	// Karena itu peta tidak pernah dimuat sampai pemiliknya menyetujui sekali.
	let diizinkan = $state(false);
	let siap = $state(false);

	onMount(async () => {
		diizinkan = await metaRepo.get(KUNCI, false);
		siap = true;
	});

	async function izinkan() {
		// Disimpan dulu baru ditampilkan: kalau urutannya dibalik, halaman yang
		// langsung dimuat ulang setelah klik akan bertanya lagi.
		try {
			await metaRepo.set(KUNCI, true);
		} catch {
			// Tidak bisa diingat, misalnya di mode penyamaran. Peta tetap dibuka
			// untuk sesi ini karena persetujuannya sudah diberikan.
		}
		diizinkan = true;
	}

	const petak = $derived(susunPetak(lokasi.lat, lokasi.lon, ZOOM, LEBAR, TINGGI));
	const koordinat = $derived(`${lokasi.lat.toFixed(2)}, ${lokasi.lon.toFixed(2)}`);
	const punyaNama = $derived(lokasi.label.trim() !== '' && lokasi.label.trim() !== koordinat);
</script>

<div style="display:flex;flex-direction:column;gap:9px">
	<span class="t-data t-data-ink">Lokasi</span>

	{#if punyaNama}
		<span style="font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink)">
			{lokasi.label}
		</span>
	{/if}

	{#if siap && diizinkan}
		<a
			href={tautanOsm(lokasi.lat, lokasi.lon)}
			target="_blank"
			rel="noopener noreferrer external"
			aria-label="Buka {koordinat} di peta penuh"
			style="position:relative;display:block;width:100%;max-width:{LEBAR}px;height:{TINGGI}px;overflow:hidden;border:1px solid rgb(27 27 23 / 0.3);border-radius:var(--r-control);background:rgb(27 27 23 / 0.06)"
		>
			{#each petak as p (p.url)}
				<img
					src={p.url}
					alt=""
					loading="lazy"
					decoding="async"
					width={UKURAN_UBIN}
					height={UKURAN_UBIN}
					style="position:absolute;left:{p.kiri}px;top:{p.atas}px;width:{UKURAN_UBIN}px;height:{UKURAN_UBIN}px;max-width:none"
				/>
			{/each}

			<!-- Paku pin yang sama seperti di papan, menandai titik tengah kotak. -->
			<span
				aria-hidden="true"
				style="position:absolute;left:50%;top:50%;width:15px;height:15px;margin:-7px 0 0 -7px;border-radius:var(--r-pin);background:radial-gradient(circle at 33% 27%, #E6A29D 0%, #B8433C 34%, #8E2F2A 60%, #4E1512 100%);box-shadow:1px 2px 0 rgb(0 0 0 / 0.35)"
			></span>

			<span
				style="position:absolute;right:0;bottom:0;padding:1px 5px;background:rgb(255 255 255 / 0.78);font-family:var(--f-data);font-size:9px;color:#1b1b17"
			>
				&copy; OpenStreetMap
			</span>
		</a>
	{:else if siap}
		<button
			type="button"
			class="tbl-garis"
			style="align-self:flex-start;min-height:34px"
			onclick={izinkan}>Tampilkan peta</button
		>
		<span
			style="font-family:var(--f-read);font-size:var(--text-xs);line-height:1.5;color:var(--ink-soft);max-width:34ch"
		>
			Petanya diambil dari OpenStreetMap, jadi mereka akan melihat koordinat ini. Tulisanmu
			sendiri tetap terenkripsi dan tidak ikut ke mana-mana.
		</span>
	{/if}

	<span style="font-family:var(--f-data);font-size:var(--text-xs);color:var(--ink-soft)">
		{koordinat}{#if cuaca}
			&middot; {labelCuaca(cuaca.code, i18n.locale)} {cuaca.tempC}&deg;C{/if}
	</span>
</div>
