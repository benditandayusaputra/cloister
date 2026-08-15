<script lang="ts">
	import Tirai from '$components/dasar/Tirai.svelte';

	interface Props {
		terbuka: boolean;
		ontutup: () => void;
		onsisip: (markdown: string) => void;
	}

	let { terbuka, ontutup, onsisip }: Props = $props();

	const MAKS = 6;
	let kolom = $state(3);
	let baris = $state(3);
	let hoverK = $state(0);
	let hoverB = $state(0);
	let langkah = $state<'ukuran' | 'isi'>('ukuran');
	let sel = $state<string[][]>([]);
	let rata = $state<Array<'kiri' | 'tengah' | 'kanan'>>([]);

	const CONTOH: Record<string, string[][]> = {
		akun: [
			['Layanan', 'Akun', 'Catatan'],
			['Kampus', 'nama@kampus.ac.id', 'ganti sandi tiap semester'],
			['Bank', 'user_bank', 'aktifkan 2FA'],
			['Email utama', 'aku@contoh.id', 'pemulihan lewat HP']
		],
		kebiasaan: [
			['Hari', 'Olahraga', 'Baca', 'Tidur'],
			['Senin', '✅', '✅', '23.00'],
			['Selasa', '—', '✅', '23.30'],
			['Rabu', '✅', '—', '22.45']
		],
		pengeluaran: [
			['Tanggal', 'Keperluan', 'Jumlah'],
			['1 Agu', 'Kos', 'Rp1.200.000'],
			['3 Agu', 'Makan sebulan', 'Rp900.000'],
			['5 Agu', 'Transport', 'Rp250.000']
		]
	};

	function mulaiKosong() {
		sel = Array.from({ length: baris }, (_, b) =>
			Array.from({ length: kolom }, (_, k) => (b === 0 ? `Kolom ${k + 1}` : ''))
		);
		rata = Array.from({ length: kolom }, () => 'kiri');
		langkah = 'isi';
	}

	function pakaiContoh(nama: string) {
		const c = CONTOH[nama];
		if (!c) return;
		sel = c.map((b) => [...b]);
		kolom = c[0]?.length ?? 3;
		baris = c.length;
		rata = Array.from({ length: kolom }, () => 'kiri');
		langkah = 'isi';
	}

	function tambahBaris() {
		if (sel.length >= 20) return;
		sel = [...sel, Array.from({ length: kolom }, () => '')];
	}

	function tambahKolom() {
		if (kolom >= 8) return;
		kolom += 1;
		sel = sel.map((b, i) => [...b, i === 0 ? `Kolom ${kolom}` : '']);
		rata = [...rata, 'kiri'];
	}

	function hapusBaris(i: number) {
		if (i === 0 || sel.length <= 2) return;
		sel = sel.filter((_, j) => j !== i);
	}

	function hapusKolom(k: number) {
		if (kolom <= 1) return;
		kolom -= 1;
		sel = sel.map((b) => b.filter((_, j) => j !== k));
		rata = rata.filter((_, j) => j !== k);
	}

	function putarRata(k: number) {
		const urutan: Array<'kiri' | 'tengah' | 'kanan'> = ['kiri', 'tengah', 'kanan'];
		const sekarang = rata[k] ?? 'kiri';
		rata[k] = urutan[(urutan.indexOf(sekarang) + 1) % 3] ?? 'kiri';
	}

	function bersih(t: string) {
		return t.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
	}

	function keMarkdown(): string {
		const lebar = Array.from({ length: kolom }, (_, k) =>
			Math.max(3, ...sel.map((b) => bersih(b[k] ?? '').length))
		);
		const pad = (t: string, k: number) => bersih(t).padEnd(lebar[k] ?? 3, ' ');
		const garis = rata.map((r, k) => {
			const w = lebar[k] ?? 3;
			if (r === 'tengah') return `:${'-'.repeat(w - 2)}:`;
			if (r === 'kanan') return `${'-'.repeat(w - 1)}:`;
			return '-'.repeat(w);
		});
		const kepala = `| ${(sel[0] ?? []).map((t, k) => pad(t, k)).join(' | ')} |`;
		const pemisah = `| ${garis.join(' | ')} |`;
		const badan = sel
			.slice(1)
			.map((b) => `| ${b.map((t, k) => pad(t, k)).join(' | ')} |`)
			.join('\n');
		return `\n${kepala}\n${pemisah}\n${badan}\n\n`;
	}

	function sisip() {
		onsisip(keMarkdown());
		tutup();
	}

	function tutup() {
		langkah = 'ukuran';
		hoverK = 0;
		hoverB = 0;
		ontutup();
	}

	function pindahSel(e: KeyboardEvent, b: number, k: number) {
		if (e.key !== 'Tab') return;
		e.preventDefault();
		let nb = b;
		let nk = e.shiftKey ? k - 1 : k + 1;
		if (nk >= kolom) {
			nk = 0;
			nb = b + 1;
			if (nb >= sel.length) tambahBaris();
		}
		if (nk < 0) {
			nk = kolom - 1;
			nb = Math.max(0, b - 1);
		}
		queueMicrotask(() => {
			const target = document.querySelector<HTMLInputElement>(`[data-sel="${nb}-${nk}"]`);
			target?.focus();
			target?.select();
		});
	}
</script>

<Tirai {terbuka} label="Sisipkan tabel" ontutup={tutup}>
	<div
		class="kertas kertas-angkat muncul"
		style="width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:var(--s-5);display:flex;flex-direction:column;gap:var(--s-4)"
	>
		<div style="display:flex;align-items:baseline;gap:var(--s-3);flex-wrap:wrap">
			<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg)">Sisipkan tabel</h2>
			<span class="t-data" style="color:var(--ink-soft)">
				{langkah === 'ukuran' ? 'Pilih ukuran, atau mulai dari contoh' : `${sel.length} baris × ${kolom} kolom`}
			</span>
		</div>

		{#if langkah === 'ukuran'}
			<div
				role="group"
				aria-label="Pilih ukuran tabel"
				style="display:grid;grid-template-columns:repeat({MAKS},28px);gap:4px;width:max-content"
				onmouseleave={() => {
					hoverK = 0;
					hoverB = 0;
				}}
			>
				{#each Array.from({ length: MAKS }) as _, b (b)}
					{#each Array.from({ length: MAKS }) as __, k (k)}
						<button
							type="button"
							aria-label="{b + 1} baris, {k + 1} kolom"
							style="width:28px;height:28px;border:1px solid rgb(27 27 23 / 0.35);border-radius:3px;cursor:pointer;background:{k <
								hoverK && b < hoverB
								? 'var(--accent)'
								: 'transparent'};transition:background var(--dur-fast) var(--ease-quiet)"
							onmouseenter={() => {
								hoverK = k + 1;
								hoverB = b + 1;
							}}
							onfocus={() => {
								hoverK = k + 1;
								hoverB = b + 1;
							}}
							onclick={() => {
								kolom = k + 1;
								baris = Math.max(2, b + 1);
								mulaiKosong();
							}}
						></button>
					{/each}
				{/each}
			</div>
			<span class="t-data" style="color:var(--ink-soft)">
				{hoverB > 0 ? `${hoverB} baris × ${hoverK} kolom` : 'Arahkan ke kotak, klik untuk memilih'}
			</span>

			<div style="display:flex;flex-direction:column;gap:8px;padding-top:var(--s-2)">
				<span class="t-data t-data-ink">Atau mulai dari contoh</span>
				<div style="display:flex;gap:8px;flex-wrap:wrap">
					<button type="button" class="tag-cip" style="min-height:36px;padding:0 14px" onclick={() => pakaiContoh('akun')}>
						🔑 Daftar akun penting
					</button>
					<button type="button" class="tag-cip" style="min-height:36px;padding:0 14px" onclick={() => pakaiContoh('kebiasaan')}>
						✅ Pelacak kebiasaan
					</button>
					<button type="button" class="tag-cip" style="min-height:36px;padding:0 14px" onclick={() => pakaiContoh('pengeluaran')}>
						💸 Catatan pengeluaran
					</button>
				</div>
			</div>
		{:else}
			<div style="overflow-x:auto;padding-bottom:4px">
				<table style="border-collapse:separate;border-spacing:4px;min-width:100%">
					<thead>
						<tr>
							{#each Array.from({ length: kolom }) as _, k (k)}
								<th style="padding:0 0 4px;text-align:left">
									<div style="display:flex;gap:2px;align-items:center">
										<button
											type="button"
											class="tag-cip"
											style="min-height:24px;padding:0 8px;font-size:0.62rem"
											title="Perataan kolom: {rata[k]}"
											aria-label="Perataan kolom {k + 1}: {rata[k]}"
											onclick={() => putarRata(k)}
											>{rata[k] === 'tengah' ? '⇔' : rata[k] === 'kanan' ? '⇒' : '⇐'}</button
										>
										{#if kolom > 1}
											<button
												type="button"
												aria-label="Hapus kolom {k + 1}"
												style="cursor:pointer;border:none;background:none;color:var(--danger);font-size:14px;line-height:1;padding:2px 4px"
												onclick={() => hapusKolom(k)}>&times;</button
											>
										{/if}
									</div>
								</th>
							{/each}
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each sel as barisSel, b (b)}
							<tr>
								{#each barisSel as nilai, k (k)}
									<td style="padding:0">
										<input
											type="text"
											data-sel="{b}-{k}"
											value={nilai}
											placeholder={b === 0 ? 'Judul kolom' : '…'}
											aria-label="Baris {b + 1} kolom {k + 1}"
											style="width:100%;min-width:110px;min-height:38px;padding:6px 10px;border:1px solid rgb(27 27 23 / 0.28);border-radius:var(--r-control);background:{b === 0
												? 'rgb(27 27 23 / 0.06)'
												: 'transparent'};font-family:var(--f-read);font-weight:{b === 0 ? 600 : 400};font-size:var(--text-sm);color:var(--ink)"
											oninput={(e) => {
												sel[b]![k] = (e.currentTarget as HTMLInputElement).value;
											}}
											onkeydown={(e) => pindahSel(e, b, k)}
										/>
									</td>
								{/each}
								<td style="padding:0 0 0 4px;width:28px">
									{#if b > 0 && sel.length > 2}
										<button
											type="button"
											aria-label="Hapus baris {b + 1}"
											style="cursor:pointer;border:none;background:none;color:var(--danger);font-size:16px;line-height:1"
											onclick={() => hapusBaris(b)}>&times;</button
										>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div style="display:flex;gap:8px;flex-wrap:wrap">
				<button type="button" class="tag-cip" style="min-height:34px;padding:0 12px" onclick={tambahBaris}>+ Baris</button>
				<button type="button" class="tag-cip" style="min-height:34px;padding:0 12px" onclick={tambahKolom} disabled={kolom >= 8}>+ Kolom</button>
				<span class="t-data" style="align-self:center;color:var(--ink-soft)">Tab untuk pindah sel</span>
			</div>

			<div style="display:flex;flex-direction:column;gap:6px">
				<span class="t-data t-data-ink">Preview</span>
				<div class="prosa" style="max-height:180px;overflow:auto;padding:0 2px">
					<table>
						<thead>
							<tr>{#each sel[0] ?? [] as h, k (k)}<th style="text-align:{rata[k] === 'tengah' ? 'center' : rata[k] === 'kanan' ? 'right' : 'left'}">{h || ' '}</th>{/each}</tr>
						</thead>
						<tbody>
							{#each sel.slice(1) as brs, b (b)}
								<tr>{#each brs as c, k (k)}<td style="text-align:{rata[k] === 'tengah' ? 'center' : rata[k] === 'kanan' ? 'right' : 'left'}">{c || ' '}</td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;padding-top:var(--s-2)">
				<button type="button" class="tbl" onclick={sisip}>Sisipkan tabel</button>
				<button type="button" class="tbl-garis" onclick={() => (langkah = 'ukuran')}>Ubah ukuran</button>
				<button type="button" class="tbl-garis" style="margin-left:auto" onclick={tutup}>Batal</button>
			</div>
		{/if}
	</div>
</Tirai>
