<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import KekuatanSandi from '$components/auth/KekuatanSandi.svelte';
	import KisiFrasa from '$components/auth/KisiFrasa.svelte';
	import { rotasi } from '$crypto/rotasi.svelte.ts';
	import { api } from '$lib/api/client.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { sandiCukup } from '$lib/utils/sandi.ts';
	import { unduhTeks } from '$lib/utils/unduh.ts';

	let buka = $state(false);
	let sandiLama = $state('');
	let sandiBaru = $state('');
	let ulang = $state('');
	let ketik = $state('');
	let frasaBaru = $state<string[]>([]);
	let tertinggal = $state(0);

	const bisa = $derived(
		sandiLama.length > 0 &&
			sandiCukup(sandiBaru) &&
			sandiBaru === ulang &&
			ketik.trim() === 'ROTASI' &&
			!rotasi.berjalan
	);

	onMount(periksaTertinggal);

	async function periksaTertinggal() {
		try {
			const r = await api<{ keyVersion: number; tertinggal: number }>('/api/account/rotate-key');
			tertinggal = r.tertinggal;
		} catch {
			tertinggal = 0;
		}
	}

	async function jalankan() {
		if (!bisa) return;
		const kdf = sesi.kdf();
		if (!kdf) return;
		if (
			!confirm(
				'Semua tulisan akan dienkripsi ulang dengan kunci baru dan semua perangkat lain harus masuk ulang. Lanjut?'
			)
		)
			return;

		try {
			const hasil = await rotasi.jalankan(sandiLama, sandiBaru, kdf);
			frasaBaru = hasil.phrase;
			sandiLama = sandiBaru = ulang = ketik = '';
			buka = false;
			await periksaTertinggal();
			toast.show(`Kunci master diganti. ${hasil.diperbarui} tulisan dibungkus ulang.`);
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<Kertas warna="manila" padding="var(--s-6)" kelas="kotak-warn">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">Rotasi kunci master</h2>

		<p class="t-baca" style="max-width:62ch">
			Kalau sebuah perangkat benar-benar hilang ke tangan orang lain, mencabut perangkat saja tidak
			cukup: kunci master mungkin masih ada di memorinya. Rotasi membuat kunci master baru,
			mengenkripsi ulang seluruh tulisanmu dengan kunci itu, dan membuat 24 kata pemulihan baru.
		</p>
		<p class="t-baca" style="max-width:62ch;color:var(--ink-soft);font-size:var(--text-sm)">
			Semua perangkat lain akan diminta masuk ulang dan menyambung lagi. Frasa pemulihan lama
			berhenti berlaku.
		</p>

		{#if tertinggal > 0}
			<div class="pita-peringatan">
				{tertinggal} tulisan di server masih memakai kunci lama. Buka Cloister di perangkat yang punya
				salinan lengkapnya lalu jalankan rotasi lagi.
			</div>
		{/if}

		{#if rotasi.berjalan}
			<div style="display:flex;flex-direction:column;gap:8px">
				<span class="t-data t-data-ink">
					{rotasi.fase === 'menyiapkan' ? 'Menyiapkan kunci baru' : 'Membungkus ulang tulisan'}
					· {rotasi.selesai}/{rotasi.total}
				</span>
				<div style="width:100%;height:4px;background:rgb(27 27 23 / 0.15)">
					<div
						style="width:{rotasi.persen}%;height:100%;background:var(--accent);transition:width var(--dur-base) var(--ease-quiet)"
					></div>
				</div>
			</div>
		{:else if !buka}
			<button type="button" class="tbl-garis" style="align-self:flex-start" onclick={() => (buka = true)}>
				Ganti kunci master
			</button>
		{:else}
			<div style="display:flex;flex-direction:column;gap:var(--s-4)">
				<Medan label="Sandi sekarang" bind:value={sandiLama} type="password" mono />
				<Medan label="Sandi baru" bind:value={sandiBaru} type="password" mono />
				<KekuatanSandi sandi={sandiBaru} />
				<Medan
					label={i18n.t.auth.ulangiSandi}
					bind:value={ulang}
					type="password"
					mono
					status={ulang ? (ulang === sandiBaru ? 'benar' : 'salah') : 'netral'}
				/>
				<Medan label="Ketik ROTASI untuk mengonfirmasi" bind:value={ketik} mono />

				<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
					<button
						type="button"
						class="tbl"
						style="background:{bisa ? 'var(--danger)' : 'var(--ink-faint)'}"
						disabled={!bisa}
						onclick={jalankan}>Ganti kunci master sekarang</button
					>
					<button type="button" class="tbl-garis" onclick={() => (buka = false)}>
						{i18n.t.app.batal}
					</button>
				</div>
			</div>
		{/if}

		{#if frasaBaru.length > 0}
			<div style="display:flex;flex-direction:column;gap:var(--s-3);padding-top:var(--s-3);border-top:1px solid rgb(27 27 23 / 0.16)">
				<div class="kotak-bahaya">
					<p class="t-baca">
						Ini 24 kata pemulihan <strong>baru</strong>. Frasa lama sudah tidak berlaku. Simpan
						sekarang juga.
					</p>
				</div>
				<KisiFrasa kata={frasaBaru} />
				<button
					type="button"
					class="tbl-garis"
					style="align-self:flex-start"
					onclick={() =>
						unduhTeks(
							'cloister-pemulihan-setelah-rotasi.txt',
							frasaBaru.map((w, i) => `${i + 1}. ${w}`).join('\n')
						)}>{i18n.t.auth.unduhTeks}</button
				>
			</div>
		{/if}
	</div>
</Kertas>
