<script lang="ts">
	import { onMount } from 'svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { LABEL_JENIS, LABEL_KATEGORI, PAKU_KATEGORI } from '$lib/redact/skor.ts';
	import { terapkan } from '$lib/redact/sunting.ts';
	import type { HasilPindai, JenisTemuan, Keputusan, Temuan, Tindakan } from '$lib/redact/tipe.ts';

	const CONTOH =
		'Kemarin ketemu Rina Kartika di kosnya di Jalan Kaliurang KM 5, Sleman. Dia cerita soal utangnya. Kalau mau bantu, transfer ke rekening BCA 0123456789 atas namanya. WA dia 0812-3456-7890, emailnya rina.k@contoh.id.';

	const TINDAKAN_BAWAAN: Partial<Record<JenisTemuan, Tindakan>> = {
		orang: 'inisial',
		alamat: 'generik',
		tempat: 'generik',
		organisasi: 'generik'
	};

	type Potongan = { teks: string; temuan?: Temuan };

	let hasilContoh = $state<HasilPindai | null>(null);
	let teksSendiri = $state('');
	let hasilSendiri = $state<HasilPindai | null>(null);
	let memindai = $state(false);
	let saringFn: ((t: string) => Promise<HasilPindai>) | null = null;

	async function muatMesin() {
		if (saringFn) return saringFn;
		const { saring } = await import('$lib/redact/klien.ts');
		saringFn = saring;
		return saring;
	}

	function keputusanBawaan(temuan: Temuan[]): Keputusan[] {
		return temuan.map((t) => ({ temuanId: t.id, tindakan: TINDAKAN_BAWAAN[t.jenis] ?? 'sensor' }));
	}

	function potong(teks: string, temuan: Temuan[]): Potongan[] {
		const urut = [...temuan].sort((a, b) => a.mulai - b.mulai);
		const hasil: Potongan[] = [];
		let i = 0;
		for (const t of urut) {
			if (t.mulai < i) continue;
			if (t.mulai > i) hasil.push({ teks: teks.slice(i, t.mulai) });
			hasil.push({ teks: teks.slice(t.mulai, t.selesai), temuan: t });
			i = t.selesai;
		}
		if (i < teks.length) hasil.push({ teks: teks.slice(i) });
		return hasil;
	}

	const potonganContoh = $derived(hasilContoh ? potong(CONTOH, hasilContoh.temuan) : [{ teks: CONTOH }]);
	const suntinganContoh = $derived(
		hasilContoh ? terapkan(CONTOH, hasilContoh.temuan, keputusanBawaan(hasilContoh.temuan)) : CONTOH
	);
	const suntinganSendiri = $derived(
		hasilSendiri ? terapkan(teksSendiri, hasilSendiri.temuan, keputusanBawaan(hasilSendiri.temuan)) : ''
	);

	onMount(() => {
		void muatMesin().then((saring) => saring(CONTOH)).then((h) => (hasilContoh = h)).catch(() => {});
	});

	async function pindaiSendiri() {
		if (!teksSendiri.trim() || memindai) return;
		memindai = true;
		try {
			const saring = await muatMesin();
			hasilSendiri = await saring(teksSendiri);
		} finally {
			memindai = false;
		}
	}
</script>

<div class="demo">
	<div class="banding">
		<div class="sisi kertas">
			<span class="label"><Ikon nama="pensil" ukuran={14} /> Tulisan asli</span>
			<p class="teks">
				{#each potonganContoh as p, i (i)}
					{#if p.temuan}
						<mark class="sorot" title={LABEL_JENIS[p.temuan.jenis]}>
							{p.teks}<span class="jenis">{LABEL_JENIS[p.temuan.jenis]}</span>
						</mark>
					{:else}
						{p.teks}
					{/if}
				{/each}
			</p>
			{#if hasilContoh}
				<span class="skor">
					<span class="paku" style="background:{PAKU_KATEGORI[hasilContoh.kategori]}"></span>
					{LABEL_KATEGORI[hasilContoh.kategori]} · {hasilContoh.temuan.length} temuan · {hasilContoh.durasiMs} ms di perangkat ini
				</span>
			{:else}
				<span class="skor">Memindai di perangkatmu…</span>
			{/if}
		</div>

		<div class="panah" aria-hidden="true">
			<Ikon nama="panah-kanan" ukuran={26} />
		</div>

		<div class="sisi kertas kertas-manila">
			<span class="label"><Ikon nama="perisai" ukuran={14} /> Yang boleh terbit</span>
			<p class="teks">{suntinganContoh}</p>
			<span class="skor">Nama jadi inisial, alamat jadi umum, nomor disensor. Tulisan aslimu tidak berubah.</span>
		</div>
	</div>

	<details class="sendiri">
		<summary>
			<Ikon nama="cari" ukuran={16} />
			Coba dengan tulisanmu sendiri
			<span class="t-data" style="margin-left:auto">tanpa akun · tidak dikirim ke mana pun</span>
		</summary>
		<div class="isi-sendiri">
			<textarea
				bind:value={teksSendiri}
				rows="4"
				maxlength="2000"
				placeholder="Tempel tulisan apa pun di sini."
				aria-label="Teks untuk dipindai"
			></textarea>
			<div class="baris">
				<button type="button" class="tbl" disabled={memindai} onclick={pindaiSendiri}>
					{memindai ? 'Memindai…' : 'Pindai di perangkat ini'}
				</button>
				<button
					type="button"
					class="tbl-garis"
					onclick={() => {
						teksSendiri = CONTOH;
						void pindaiSendiri();
					}}>Isi dengan contoh</button
				>
			</div>
			{#if hasilSendiri}
				<div class="hasil">
					<span class="skor">
						<span class="paku" style="background:{PAKU_KATEGORI[hasilSendiri.kategori]}"></span>
						{LABEL_KATEGORI[hasilSendiri.kategori]} · skor {hasilSendiri.skor}
					</span>
					{#if hasilSendiri.temuan.length > 0}
						<div class="cip">
							{#each hasilSendiri.temuan as t (t.id)}
								<span class="tag-cip" title={t.alasan}>
									<strong>{LABEL_JENIS[t.jenis]}</strong>
									<span>{t.teks}</span>
								</span>
							{/each}
						</div>
						<p class="teks kecil"><strong>Hasil sunting:</strong> {suntinganSendiri}</p>
					{:else}
						<p class="teks kecil">Bersih — tidak ditemukan hal yang mengarah ke orang tertentu.</p>
					{/if}
				</div>
			{/if}
		</div>
	</details>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		gap: var(--s-4);
	}
	.banding {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		gap: var(--s-4);
		align-items: stretch;
	}
	@media (max-width: 760px) {
		.banding {
			grid-template-columns: minmax(0, 1fr);
		}
		.panah {
			rotate: 90deg;
			justify-self: center;
		}
	}
	.sisi {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: var(--s-5);
	}
	.label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--f-data);
		font-size: var(--text-2xs);
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.teks {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.75;
		color: var(--ink);
		text-wrap: pretty;
	}
	.teks.kecil {
		font-size: var(--text-sm);
	}
	.sorot {
		position: relative;
		background: rgb(168 48 43 / 0.16);
		color: inherit;
		padding: 1px 4px;
		border-bottom: 2px solid var(--thread);
		border-radius: 2px;
	}
	.jenis {
		display: inline-block;
		margin-left: 5px;
		padding: 0 5px;
		font-family: var(--f-data);
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #fff;
		background: var(--thread);
		border-radius: 2px;
		vertical-align: middle;
		transform: translateY(-1px);
	}
	.skor {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: auto;
		font-family: var(--f-data);
		font-size: var(--text-2xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.paku {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.panah {
		display: grid;
		place-items: center;
		color: var(--ink-on-board-dim);
	}
	.sendiri {
		border: 1px solid var(--garis-ruang);
		border-radius: var(--r-control);
		background: var(--isi-ruang);
	}
	.sendiri summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		min-height: 52px;
		padding: 0 var(--s-4);
		font-family: var(--f-display);
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--ink-on-board);
	}
	.sendiri summary::-webkit-details-marker {
		display: none;
	}
	.sendiri summary::before {
		content: '+';
		font-family: var(--f-data);
		color: var(--ink-on-board-dim);
	}
	.sendiri[open] summary::before {
		content: '−';
	}
	.isi-sendiri {
		display: flex;
		flex-direction: column;
		gap: var(--s-3);
		padding: 0 var(--s-4) var(--s-4);
	}
	.isi-sendiri textarea {
		width: 100%;
		resize: vertical;
		border: 1px solid var(--garis-ruang-kuat);
		border-radius: var(--r-control);
		padding: 12px 14px;
		background: rgb(0 0 0 / 0.2);
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.6;
		color: var(--ink-on-board);
	}
	.isi-sendiri textarea::placeholder {
		color: var(--ink-on-board-dim);
	}
	.baris {
		display: flex;
		gap: var(--s-3);
		flex-wrap: wrap;
	}
	.baris .tbl-garis {
		border-color: var(--garis-ruang-kuat);
		color: var(--ink-on-board);
	}
	.hasil {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: var(--s-4);
		background: var(--paper-bone);
		border-radius: var(--r-control);
	}
	.cip {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cip .tag-cip {
		cursor: default;
		display: inline-flex;
		gap: 6px;
		align-items: baseline;
	}
	.cip strong {
		font-family: var(--f-data);
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.cip span span {
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
