<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Toaster from '$components/dasar/Toaster.svelte';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let { children } = $props();

	onMount(() => {
		tema.init();
		i18n.init();
		document.documentElement.lang = i18n.locale;
	});
</script>

{@render children()}
<Toaster />
