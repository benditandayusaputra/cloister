<script lang="ts">
	import QRCode from 'qrcode';

	interface Props {
		teks: string;
		ukuran?: number;
	}

	let { teks, ukuran = 240 }: Props = $props();
	let dataUrl = $state('');

	$effect(() => {
		const t = teks;
		if (!t) return;
		void QRCode.toDataURL(t, {
			width: ukuran * 2,
			margin: 1,
			errorCorrectionLevel: 'M',
			color: { dark: '#1B1B17', light: '#F7F4EA' }
		}).then((u) => (dataUrl = u));
	});
</script>

<div
	style="padding:20px 20px 58px;background:#F7F4EA;box-shadow:var(--sh-contact), var(--sh-lifted);transform:rotate(-1.6deg)"
>
	{#if dataUrl}
		<img
			src={dataUrl}
			alt="Kode QR penyambungan perangkat"
			style="width:{ukuran}px;height:{ukuran}px;display:block;image-rendering:pixelated"
		/>
	{:else}
		<div
			style="width:{ukuran}px;height:{ukuran}px;display:grid;place-items:center;background:#EDEAE0;animation:bd-skel 1200ms infinite"
		></div>
	{/if}
</div>
