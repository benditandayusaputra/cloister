<script lang="ts">
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
</script>

{#if sync.status === 'offline'}
	<div class="pita-peringatan" role="status">
		{i18n.t.sync.pitaOffline}
		{#if sync.antre > 0}&nbsp;{i18n.t.sync.antre(sync.antre)}.{/if}
	</div>
{:else if sync.status === 'error'}
	<div class="pita-peringatan" style="border-left-color:var(--danger)" role="status">
		{i18n.t.sync.gagal}. {i18n.t.sync.antre(sync.antre)}.
	</div>
{/if}
