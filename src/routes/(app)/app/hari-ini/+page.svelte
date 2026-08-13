<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { todayIso } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	onMount(() => {
		const [y, m, d] = todayIso().split('-');
		void goto(`/app/${y}/${m}/${d}?baru=1`, { replaceState: true });
	});
</script>

<div class="ruangan" style="display:grid;place-items:center;min-height:100vh">
	<span class="t-data">{i18n.t.umum.memuat}…</span>
</div>
