<script lang="ts">
	import { saring, hangatkan, statusPenyaring } from '$lib/redact/klien.ts';
	import {
		LABEL_JENIS,
		LABEL_KATEGORI,
		PAKU_KATEGORI,
		PESAN_KATEGORI
	} from '$lib/redact/skor.ts';
	import { terapkanSatu } from '$lib/redact/sunting.ts';
	import type { HasilPindai, Keputusan, Tindakan } from '$lib/redact/tipe.ts';
	import { plainTeks } from '$lib/utils/teks.ts';

	interface Props {
		/** Markdown mentah catatan yang akan diterbitkan. */
		markdown: string;
		/** Matikan lapis 2 (saklar di Pengaturan → Publik). */
		pakaiEntitas?: boolean;
		/** Dipanggil tiap kali hasil atau keputusan berubah. */
		onberubah: (hasil: HasilPindai | null, keputusan: Keputusan[]) => void;
	}

	let { markdown, pakaiEntitas = true, onberubah }: Props = $props();

	let hasil = $state<HasilPindai | null>(null);
	let memindai = $state(true);
	let keputusan = $state<Record<string, Tindakan>>({});

	const TINDAKAN: Array<{ nilai: Tindakan; label: string }> = [
		{ nilai: 'sensor', label: 'Sensor' },
		{ nilai: 'inisial', label: 'Inisial' },
		{ nilai: 'generik', label: 'Ganti generik' },
		{ nilai: 'biarkan', label: 'Biarkan' }
	];

	const daftarKeputusan = $derived(
		Object.entries(keputusan).map(([temuanId, tindakan]) => ({ temuanId, tindakan }))
	);

	function lapor() {
		onberubah(hasil, daftarKeputusan);
	}

	async function jalankan() {
		memindai = true;
		hangatkan();
		try {
			hasil = await saring(plainTeks(markdown), pakaiEntitas);
		} finally {
			memindai = false;
			lapor();
		}
	}

	function pilih(temuanId: string, tindakan: Tindakan) {
		keputusan =
			keputusan[temuanId] === tindakan
				? Object.fromEntries(Object.entries(keputusan).filter(([k]) => k !== temuanId))
				: { ...keputusan, [temuanId]: tindakan };
		lapor();
	}

	$effect(() => {
		// Sengaja hanya bergantung pada markdown: mengganti saklar lapis 2 di
		// tengah alur terbit bukan sesuatu yang bisa terjadi dari modal ini.
		void markdown;
		keputusan = {};
		void jalankan();
	});

	const warnaPaku = $derived(hasil ? PAKU_KATEGORI[hasil.kategori] : 'var(--ink-soft)');
	const jalur = $derived(statusPenyaring().mode === 'worker' ? 'Web Worker terpisah' : 'thread utama');
</script>

<section
	aria-label="Penyaring Identitas"
	style="display:flex;flex-direction:column;gap:var(--s-4);padding:var(--s-4) 0;border-top:1px solid rgb(27 27 23 / 0.16)"
>
	<header style="display:flex;align-items:flex-start;gap:12px">
		<span
			aria-hidden="true"
			class="pin-bulat"
			style="flex:none;margin-top:3px;width:16px;height:16px;background:radial-gradient(circle at 32% 28%, color-mix(in srgb, {warnaPaku} 70%, white), {warnaPaku} 62%, color-mix(in srgb, {warnaPaku} 70%, black))"
		></span>
		<div style="display:flex;flex-direction:column;gap:4px">
			<span class="t-data t-data-ink">Penyaring Identitas</span>
			{#if memindai}
				<span style="font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-soft)">
					Memindai di perangkat ini…
				</span>
			{:else if hasil}
				<strong
					style="font-family:var(--f-judul);font-size:var(--text-md);color:var(--ink);font-weight:600"
				>
					{LABEL_KATEGORI[hasil.kategori]} · skor paparan {hasil.skor}
				</strong>
				<span
					style="font-family:var(--f-read);font-size:var(--text-sm);line-height:1.6;color:var(--ink-soft);max-width:56ch"
				>
					{PESAN_KATEGORI[hasil.kategori]}
				</span>
			{/if}
		</div>
	</header>

	{#if hasil && hasil.temuan.length > 0}
		<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">
			{#each hasil.temuan as t (t.id)}
				{@const dipilih = keputusan[t.id]}
				<li
					class="kertas kertas-buram"
					style="padding:12px 14px;display:flex;flex-direction:column;gap:8px"
				>
					<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline">
						<span class="t-data t-data-ink">{LABEL_JENIS[t.jenis]}</span>
						<code
							style="font-family:var(--f-data);font-size:0.82rem;color:var(--ink);background:rgb(27 27 23 / 0.06);padding:1px 6px;border-radius:3px;word-break:break-all"
							>{t.teks}</code
						>
						<span
							style="margin-left:auto;font-family:var(--f-data);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-soft)"
							>lapis {t.sumber === 'pola' ? '1 · pola' : '2 · entitas'}</span
						>
					</div>

					<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
						{t.alasan}
					</span>

					<div style="display:flex;flex-wrap:wrap;gap:6px">
						{#each TINDAKAN as a (a.nilai)}
							<button
								type="button"
								class="tag-cip {dipilih === a.nilai ? 'tag-cip-aktif' : ''}"
								aria-pressed={dipilih === a.nilai}
								onclick={() => pilih(t.id, a.nilai)}
							>
								{a.label}
							</button>
						{/each}
						{#if dipilih && dipilih !== 'biarkan'}
							<span
								style="align-self:center;font-family:var(--f-data);font-size:0.75rem;color:var(--ink-soft)"
								>&rarr; {terapkanSatu(t, dipilih)}</span
							>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- PRD 13.5 dan 13.6: perlihatkan apa yang benar-benar berjalan, termasuk batasnya. -->
	<div
		class="kotak-warn"
		style="display:flex;flex-direction:column;gap:6px;font-family:var(--f-read);font-size:0.8rem;line-height:1.6"
	>
		<strong>Pemindaian berjalan di perangkat ini. Tidak ada teks yang dikirim ke mana pun.</strong>
		<span>
			Lapis 1 pola terstruktur{pakaiEntitas ? ' dan lapis 2 pengenal entitas' : ''}, keduanya di
			{jalur}. Buka tab Network lalu pindai ulang — tidak ada satu pun permintaan keluar.
		</span>
		<span>
			Ini alat bantu, bukan jaminan. Nama yang tidak lazim dan singkatan masih bisa terlewat, dan
			sebagian tanda bisa salah tangkap.
		</span>
	</div>
</section>
