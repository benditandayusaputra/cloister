<script lang="ts">
	import { goto } from '$app/navigation';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import AnimasiKunci from '$components/auth/AnimasiKunci.svelte';
	import KisiFrasa from '$components/auth/KisiFrasa.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import KotakKode from '$components/auth/KotakKode.svelte';
	import { crypto } from '$crypto/client.ts';
	import { KDF_DEFAULT, type KdfParams } from '$crypto/kdf.ts';
	import { authApi, toKdfParams } from '$lib/api/endpoints.ts';
	import { api, tokenStore } from '$lib/api/client.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { metaRepo } from '$lib/db/local/repo.ts';
	import { resetLocalDb } from '$lib/db/local/db.ts';
	import { namaPerangkat, platformPerangkat } from '$lib/utils/perangkat.ts';
	import { unduhTeks } from '$lib/utils/unduh.ts';

	type Layar = 'peringatan' | 'kode' | 'konfirmasi' | 'kerja' | 'frasa';

	let layar = $state<Layar>('peringatan');
	let email = $state('');
	let sandi = $state('');
	let ketik = $state('');
	let kode = $state(['', '', '', '', '', '']);
	let perluKode = $state(true);
	let sibuk = $state(false);
	let langkahKunci = $state(0);
	let kdf = $state<KdfParams>(KDF_DEFAULT);

	let jumlahEntri = $state(0);
	let tenggangHari = $state(30);
	let frasaBaru = $state<string[]>([]);

	const bisaMinta = $derived(
		email.includes('@') && sandi.length > 0 && ketik.trim() === 'MULAI DARI NOL' && !sibuk
	);

	async function mintaKode() {
		if (!bisaMinta) return;
		sibuk = true;
		try {
			const p = await authApi.params(email);
			kdf = toKdfParams(p.kdf);
			const { authKey } = await crypto.derive(sandi, p.saltUser, kdf);

			const res = await api<{ perluKode: boolean; jumlahEntri: number; tenggangHari: number }>(
				'/api/auth/mulai-baru',
				{ method: 'POST', body: { email, authKey }, auth: false }
			);
			jumlahEntri = res.jumlahEntri;
			tenggangHari = res.tenggangHari;
			perluKode = res.perluKode;

			if (!perluKode) {
				layar = 'konfirmasi';
				return;
			}
			layar = 'kode';
			toast.show('Kode dikirim ke emailmu. Berlaku 10 menit.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function jalankan() {
		const nilaiKode = kode.join('');
		if (sibuk || (perluKode && nilaiKode.length !== 6)) return;
		sibuk = true;
		const layarAsal = layar;
		layar = 'kerja';
		langkahKunci = 0;
		const tik = setInterval(() => (langkahKunci = Math.min(2, langkahKunci + 1)), 800);
		try {
			const p = await authApi.params(email);
			const { authKey } = await crypto.derive(sandi, p.saltUser, toKdfParams(p.kdf));

			// Brankas baru dibuat di perangkat ini, sama seperti saat mendaftar.
			kdf = await crypto.benchmark();
			const baru = await crypto.register(sandi, kdf);

			const res = await api<{ deviceId: string; accessToken: string }>('/api/auth/mulai-baru', {
				method: 'PUT',
				body: {
					email,
					authKey,
					code: perluKode ? nilaiKode : undefined,
					authKeyBaru: baru.authKey,
					saltUser: baru.saltUser,
					kdf,
					wrappedMk: baru.wrappedMk,
					mkNonce: baru.mkNonce,
					recoveryWrappedMk: baru.recoveryWrappedMk,
					recoveryNonce: baru.recoveryNonce,
					recoverySalt: baru.recoverySalt,
					recoveryAuthKey: baru.recoveryAuthKey,
					deviceName: namaPerangkat(),
					platform: platformPerangkat()
				},
				auth: false
			});

			// Arsip lokal yang tidak bisa dibuka lagi ikut dibersihkan.
			await resetLocalDb();
			tokenStore.set(res.accessToken);
			await metaRepo.set('deviceId', res.deviceId);
			await sesi.simpanBrankas();
			await sesi.bangun();

			frasaBaru = baru.phrase;
			layar = 'frasa';
		} catch (err) {
			layar = layarAsal;
			kode = ['', '', '', '', '', ''];
			toast.bahaya((err as Error).message);
		} finally {
			clearInterval(tik);
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Mulai dari nol · Cloister</title></svelte:head>

<CangkangAuth lebar={layar === 'frasa' ? 'lebar' : 'form'}>
	{#if layar === 'peringatan'}
		<Kertas angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink)">Mulai dari nol</h1>

				<div class="kotak-bahaya">
					<p class="t-baca" style="max-width:62ch">
						Ini untuk keadaan kamu masih ingat sandi, tapi <strong>tidak punya 24 kata pemulihan
						dan tidak punya perangkat lama</strong> yang masih bisa dibuka. Papanmu akan dimulai
						kosong dengan kunci yang benar-benar baru.
					</p>
				</div>

				<p class="t-baca" style="color:var(--ink-soft);max-width:62ch">
					Tulisan lama tidak langsung dihapus. Kami simpan 30 hari, terenkripsi seperti sebelumnya.
					Kalau dalam masa itu kamu menemukan 24 kata yang lama, semuanya masih bisa diambil
					kembali lewat Pengaturan &rarr; Data. Lewat dari itu, dibuang permanen dan tidak ada
					yang bisa mengembalikannya, termasuk kami.
				</p>

				<p class="t-baca" style="color:var(--ink-soft);max-width:62ch;font-size:var(--text-sm)">
					Kalau emailmu sudah terverifikasi, kami kirim kode ke sana dulu supaya orang yang cuma
					tahu sandimu tidak bisa menghanguskan jurnalmu. Kalau belum, langkah berikutnya langsung
					konfirmasi terakhir.
				</p>

				<Medan label={i18n.t.auth.email} bind:value={email} type="email" placeholder="kamu@contoh.id" />
				<Medan label={i18n.t.auth.sandi} bind:value={sandi} type="password" mono />
				<Medan
					label='Ketik "MULAI DARI NOL" untuk melanjutkan'
					bind:value={ketik}
					mono
					status={ketik && ketik.trim() !== 'MULAI DARI NOL' ? 'salah' : 'netral'}
				/>

				<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
					<button
						type="button"
						class="tbl"
						style="background:{bisaMinta ? 'var(--danger)' : 'var(--ink-faint)'}"
						disabled={!bisaMinta}
						onclick={mintaKode}>{sibuk ? i18n.t.umum.memuat : 'Lanjutkan'}</button
					>
					<a href="/pulih" class="tbl-garis" style="text-decoration:none">Aku punya 24 katanya</a>
				</div>
			</div>
		</Kertas>
	{:else if layar === 'kode'}
		<Kertas warna="biru" angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink)">{i18n.t.auth.cekEmail}</h1>
				<p class="t-baca" style="color:var(--ink-soft);max-width:52ch">
					{i18n.t.auth.cekEmailSub(email)}
				</p>

				<div class="kotak-bahaya">
					<p class="t-baca">
						Setelah kode dimasukkan, <strong>{jumlahEntri} tulisan</strong> akan berhenti bisa
						dibuka di semua perangkat. Kami simpan {tenggangHari} hari untuk berjaga-jaga.
					</p>
				</div>

				<!-- Sengaja tidak auto-kirim: ini menghanguskan jurnal, jadi harus ada klik terakhir. -->
				<KotakKode nilai={kode} onubah={(v) => (kode = v)} />

				<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
					<button
						type="button"
						class="tbl"
						style="background:{kode.join('').length === 6 ? 'var(--danger)' : 'var(--ink-faint)'}"
						disabled={kode.join('').length !== 6 || sibuk}
						onclick={jalankan}>Mulai dari nol sekarang</button
					>
					<button type="button" class="tbl-garis" onclick={() => (layar = 'peringatan')}>
						{i18n.t.app.batal}
					</button>
				</div>
			</div>
		</Kertas>
	{:else if layar === 'konfirmasi'}
		<Kertas warna="biru" angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink)">Sekali klik lagi</h1>

				<div class="kotak-bahaya">
					<p class="t-baca" style="max-width:62ch">
						Emailmu belum pernah diverifikasi, jadi tidak ada kode yang bisa kami kirim. Begitu tombol
						di bawah ditekan, <strong>{jumlahEntri} tulisan</strong> berhenti bisa dibuka di semua
						perangkat. Kami simpan {tenggangHari} hari untuk berjaga-jaga.
					</p>
				</div>

				<p class="t-baca" style="color:var(--ink-soft);max-width:62ch;font-size:var(--text-sm)">
					Kalau lain kali kamu memverifikasi email, langkah ini akan meminta kode dulu supaya orang
					yang cuma tahu sandimu tidak bisa melakukannya.
				</p>

				<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
					<button type="button" class="tbl" style="background:var(--danger)" disabled={sibuk} onclick={jalankan}>
						Mulai dari nol sekarang
					</button>
					<button type="button" class="tbl-garis" onclick={() => (layar = 'peringatan')}>
						{i18n.t.app.batal}
					</button>
				</div>
			</div>
		</Kertas>
	{:else if layar === 'kerja'}
		<AnimasiKunci langkah={langkahKunci} {kdf} />
	{:else}
		<div class="kertas kertas-angkat" style="padding:var(--s-7) var(--s-6);display:flex;flex-direction:column;gap:var(--s-5)">
			<h1 class="t-judul t-xl" style="color:var(--ink)">Papanmu sudah kosong dan siap</h1>

			<div class="kotak-bahaya">
				<p class="t-baca" style="max-width:62ch">
					Ini 24 kata pemulihan <strong>baru</strong>. Simpan sekarang juga, di kertas, di tempat
					yang berbeda dari perangkat ini. Ini satu-satunya jalan balik kalau sandimu lupa lagi.
				</p>
			</div>

			<KisiFrasa kata={frasaBaru} />

			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
				<button
					type="button"
					class="tbl-garis"
					onclick={() =>
						unduhTeks(
							'cloister-pemulihan-baru.txt',
							`FRASA PEMULIHAN CLOISTER\n\n${frasaBaru.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n`
						)}>{i18n.t.auth.unduhTeks}</button
				>
				<button type="button" class="tbl" onclick={() => goto('/app')}>Mulai menulis</button>
			</div>

			<p class="t-baca" style="color:var(--ink-soft);font-size:var(--text-sm);max-width:62ch">
				Tulisan lamamu masih tersimpan terenkripsi selama {tenggangHari} hari. Kalau 24 kata yang
				lama ketemu, buka Pengaturan &rarr; Data sebelum tenggat itu.
			</p>
		</div>
	{/if}
</CangkangAuth>
