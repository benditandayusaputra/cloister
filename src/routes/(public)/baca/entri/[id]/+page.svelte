<script lang="ts">
	import LembarPublik from '$components/publik/LembarPublik.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.entri.title} · Cloister</title>
	<meta name="description" content={data.entri.excerpt} />
	<meta property="og:title" content={data.entri.title} />
	<meta property="og:description" content={data.entri.excerpt} />
	<meta property="og:type" content="article" />
	{#if data.entri.moderationState !== 'ok'}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<LembarPublik entri={data.entri} />
