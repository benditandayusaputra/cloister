<script lang="ts">
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import type { KdfParams } from '$crypto/kdf.ts';

	interface Props {
		langkah: number;
		kdf: KdfParams;
	}
	let { langkah, kdf }: Props = $props();

	const status = $derived(
		[i18n.t.auth.kunciSiap, i18n.t.auth.kunciTidakDikirim, i18n.t.auth.bukaArsip][
			Math.min(langkah, 2)
		]
	);
	const progres = $derived(`${Math.min(100, (langkah + 1) * 34)}%`);
</script>

<div
	style="display:flex;flex-direction:column;align-items:center;gap:var(--s-6);padding:var(--s-8) var(--s-6)"
>
	<div style="position:relative;width:196px;height:74px" aria-hidden="true">
		<div
			style="position:absolute;left:0;top:14px;width:46px;height:46px;border-radius:var(--r-pin);border:11px solid var(--pin-brass);background:transparent;box-shadow:1px 2px 0 rgb(0 0 0 / 0.3), inset 1px 1px 2px rgb(255 255 255 / 0.25);animation:bd-kunci 900ms var(--ease-lift) both"
		></div>
		<div
			style="position:absolute;left:44px;top:30px;width:126px;height:14px;background:linear-gradient(180deg, #E0B45F, var(--pin-brass) 45%, #6E4A12);box-shadow:1px 2px 0 rgb(0 0 0 / 0.3);animation:bd-kunci 700ms var(--ease-lift) 700ms both"
		></div>
		<div
			style="position:absolute;left:146px;top:44px;width:12px;height:22px;background:linear-gradient(180deg, var(--pin-brass), #6E4A12);animation:bd-kunci 400ms var(--ease-lift) 1300ms both"
		></div>
		<div
			style="position:absolute;left:166px;top:44px;width:12px;height:16px;background:linear-gradient(180deg, var(--pin-brass), #6E4A12);animation:bd-kunci 400ms var(--ease-lift) 1550ms both"
		></div>
		<div
			style="position:absolute;left:8px;top:22px;width:14px;height:14px;border-radius:var(--r-pin);background:rgb(255 240 205 / 0.75);filter:blur(3px);animation:bd-kilau 1800ms var(--ease-quiet) infinite"
		></div>
	</div>

	<div
		style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"
		role="status"
	>
		<span style="font-family:var(--f-data);font-size:var(--text-base);color:var(--ink-on-board)"
			>{status}</span
		>
		<span class="t-data">{i18n.t.auth.kdfInfo(kdf.time, Math.round(kdf.memKib / 1024))}</span>
	</div>

	<div style="width:220px;height:3px;background:var(--garis-ruang)">
		<div
			style="width:{progres};height:100%;background:var(--pin-brass);transition:width var(--dur-slow) var(--ease-quiet)"
		></div>
	</div>
</div>
