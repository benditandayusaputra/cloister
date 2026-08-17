<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import Toaster from '$components/dasar/Toaster.svelte';
	import DialogKonfirmasi from '$components/dasar/DialogKonfirmasi.svelte';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let { children } = $props();
	let navigasiAktif = $state(false);
	let timerSelesai: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		tema.init();
		i18n.init();
		document.documentElement.lang = i18n.locale;
	});

	onNavigate((navigasi) => {
		navigasiAktif = true;
		if (timerSelesai) clearTimeout(timerSelesai);
		void navigasi.complete.then(
			() => {
				timerSelesai = setTimeout(() => (navigasiAktif = false), 180);
			},
			() => {
				navigasiAktif = false;
			}
		);

		const doc = document as Document & {
			startViewTransition?: (cb: () => Promise<void>) => {
				finished: Promise<void>;
				ready: Promise<void>;
				updateCallbackDone: Promise<void>;
			};
		};
		if (!doc.startViewTransition) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			const transisi = doc.startViewTransition!(async () => {
				resolve();
				await navigasi.complete;
			});
			transisi.finished.catch(() => {});
			transisi.ready.catch(() => {});
			transisi.updateCallbackDone.catch(() => {});
		});
	});
</script>

<div
	class="progress-navigasi"
	class:aktif={navigasiAktif}
	role="progressbar"
	aria-label={i18n.t.umum.memuat}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuetext={i18n.t.umum.memuat}
	aria-hidden={!navigasiAktif}
></div>
{@render children()}
<Toaster />
<DialogKonfirmasi />
