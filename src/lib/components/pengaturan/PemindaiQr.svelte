<script lang="ts">
	import { onDestroy } from 'svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		onbaca: (teks: string) => void;
	}

	let { onbaca }: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let aktif = $state(false);
	let pesan = $state('');
	let stream: MediaStream | null = null;
	let loop: number | null = null;

	const adaDetektor = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

	async function mulai() {
		pesan = '';
		if (!adaDetektor()) {
			pesan = 'Peramban ini tidak punya pemindai bawaan. Pakai kode manual di bawah.';
			return;
		}
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			if (!video) return;
			video.srcObject = stream;
			await video.play();
			aktif = true;

			const Detector = (window as unknown as { BarcodeDetector: new (o: object) => { detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
			const detector = new Detector({ formats: ['qr_code'] });

			const pindai = async () => {
				if (!aktif || !video) return;
				try {
					const hasil = await detector.detect(video);
					const nilai = hasil[0]?.rawValue;
					if (nilai) {
						hentikan();
						onbaca(nilai);
						return;
					}
				} catch {
					// bingkai gagal dibaca, coba lagi
				}
				loop = requestAnimationFrame(() => void pindai());
			};
			void pindai();
		} catch {
			pesan = 'Izin kamera ditolak. Pakai kode manual di bawah.';
		}
	}

	function hentikan() {
		aktif = false;
		if (loop) cancelAnimationFrame(loop);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	onDestroy(hentikan);
</script>

<div style="display:flex;flex-direction:column;gap:var(--s-3);align-items:center">
	<div
		style="position:relative;width:min(300px, 100%);aspect-ratio:1;background:linear-gradient(160deg, #1E2326, #0F1113);box-shadow:inset 0 0 60px rgb(0 0 0 / 0.6);overflow:hidden"
	>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={video}
			playsinline
			muted
			style="width:100%;height:100%;object-fit:cover;display:{aktif ? 'block' : 'none'}"
		></video>

		<span style="position:absolute;left:14px;top:14px;width:38px;height:38px;border-left:3px solid var(--pin-brass);border-top:3px solid var(--pin-brass)"></span>
		<span style="position:absolute;right:14px;top:14px;width:38px;height:38px;border-right:3px solid var(--pin-brass);border-top:3px solid var(--pin-brass)"></span>
		<span style="position:absolute;left:14px;bottom:14px;width:38px;height:38px;border-left:3px solid var(--pin-brass);border-bottom:3px solid var(--pin-brass)"></span>
		<span style="position:absolute;right:14px;bottom:14px;width:38px;height:38px;border-right:3px solid var(--pin-brass);border-bottom:3px solid var(--pin-brass)"></span>

		{#if !aktif}
			<button
				type="button"
				class="t-data"
				style="position:absolute;inset:0;border:none;background:transparent;cursor:pointer;color:var(--ink-on-board-dim)"
				onclick={mulai}>Nyalakan kamera</button
			>
		{/if}
	</div>

	{#if pesan}
		<span class="t-data" style="color:var(--warn);text-align:center;max-width:34ch">{pesan}</span>
	{:else}
		<span class="t-data">{i18n.t.pengaturan.arahkanKamera}</span>
	{/if}
</div>
