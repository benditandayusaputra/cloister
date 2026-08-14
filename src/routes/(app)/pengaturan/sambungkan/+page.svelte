<script lang="ts">
	import { onDestroy } from 'svelte';
	import KodeQr from '$components/pengaturan/KodeQr.svelte';
	import { crypto } from '$crypto/client.ts';
	import { encodeQr, secretFromB32 } from '$crypto/transfer.ts';
	import { deviceApi } from '$lib/api/endpoints.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let sessionId = $state('');
	let pin = $state('');
	let secret = $state('');
	let manual = $state('');
	let sisa = $state(0);
	let sibuk = $state(false);
	let tampilManual = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;

	const qrText = $derived(sessionId && secret ? encodeQr(sessionId, secretFromB32(secret)) : '');
	const persen = $derived(`${Math.max(0, Math.round((sisa / 180) * 100))}%`);
	const warnaBar = $derived(sisa < 30 ? 'var(--danger)' : sisa < 60 ? 'var(--warn)' : 'var(--ok)');

	async function buat() {
		sibuk = true;
		try {
			const tawaran = await crypto.createTransfer();
			const s = await deviceApi.createTransfer(tawaran.blob, tawaran.nonce);
			sessionId = s.sessionId;
			pin = tawaran.pin;
			secret = tawaran.secret;
			manual = `cloister://sambung?s=${s.sessionId}&k=${tawaran.secret}`;
			sisa = s.ttlSec;
			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				sisa -= 1;
				if (sisa <= 0) {
					clearInterval(timer!);
					sessionId = '';
					toast.show('Kode kedaluwarsa. Buat lagi kalau masih perlu.');
				}
			}, 1000);
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	onDestroy(() => timer && clearInterval(timer));
</script>

<svelte:head><title>Sambungkan perangkat · Cloister</title></svelte:head>

<div style="display:flex;flex-direction:column;gap:var(--s-5);align-items:center;padding:var(--s-6) 0">
	<div style="display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;max-width:52ch">
		<h1 class="t-judul t-xl">{i18n.t.pengaturan.transferJudul}</h1>
		<p class="t-baca" style="color:var(--ink-on-board-dim)">{i18n.t.pengaturan.transferSub}</p>
	</div>

	{#if !sessionId}
		<button type="button" class="tbl" disabled={sibuk} onclick={buat}>
			{sibuk ? i18n.t.umum.memuat : 'Buat kode penyambungan'}
		</button>
		<p class="t-baca" style="max-width:56ch;text-align:center;color:var(--ink-on-board-dim);font-size:var(--text-sm)">
			QR membawa 256 bit entropi, PIN 6 digit ditampilkan terpisah. Penyerang yang sempat memotret QR
			tetap butuh PIN, dan sesi mati setelah 3 menit atau 5 percobaan gagal.
		</p>
	{:else}
		<KodeQr teks={qrText} />

		<div
			class="kertas"
			style="display:flex;flex-direction:column;gap:12px;align-items:center;padding:var(--s-5) var(--s-6)"
		>
			<span class="t-data t-data-ink">{i18n.t.pengaturan.pinTransfer}</span>
			<span
				data-testid="pin-transfer"
				style="font-family:var(--f-data);font-size:var(--text-xl);letter-spacing:0.34em;color:var(--ink);padding-left:0.34em"
				>{pin.slice(0, 3)} {pin.slice(3)}</span
			>
		</div>

		<div style="width:min(320px, 100%);display:flex;flex-direction:column;gap:8px;align-items:center">
			<div style="width:100%;height:3px;background:var(--garis-ruang)">
				<div style="width:{persen};height:100%;background:{warnaBar};transition:width 1s linear"></div>
			</div>
			<span class="t-data">Berlaku {sisa} detik lagi</span>
		</div>

		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;justify-content:center">
			<button type="button" class="tbl-papan" onclick={() => (tampilManual = !tampilManual)}>
				{i18n.t.pengaturan.kodeManual}
			</button>
			<button type="button" class="tbl-papan" onclick={buat}>Buat kode baru</button>
			<a href="/pengaturan/perangkat" class="tbl-papan" style="text-decoration:none"
				>{i18n.t.umum.kembali}</a
			>
		</div>

		{#if tampilManual}
			<div
				data-testid="kode-manual"
				style="max-width:520px;padding:var(--s-4);border:1px solid var(--garis-ruang);border-radius:var(--r-control);font-family:var(--f-data);font-size:var(--text-sm);line-height:1.7;color:var(--ink-on-board);word-break:break-all"
			>
				{manual}
			</div>
			<button
				type="button"
				class="tbl-papan"
				onclick={() => {
					void navigator.clipboard.writeText(manual);
					toast.show('Kode manual tersalin.');
				}}>Salin kode manual</button
			>
		{/if}
	{/if}
</div>
