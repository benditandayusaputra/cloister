<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import Toaster from '$components/dasar/Toaster.svelte';
	import DialogKonfirmasi from '$components/dasar/DialogKonfirmasi.svelte';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let { children } = $props();

	onMount(() => {
		tema.init();
		i18n.init();
		document.documentElement.lang = i18n.locale;
	});

	onNavigate((navigasi) => {
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

{@render children()}
<Toaster />
<DialogKonfirmasi />
