<script lang="ts">
	import { toast } from '$lib/state/toast.svelte.ts';
</script>

<div style="position:fixed;right:24px;bottom:24px;z-index:70;display:flex;flex-direction:column;gap:10px;align-items:flex-end">
	{#each toast.items as item (item.id)}
		<button
			type="button"
			class="toast"
			style="position:static;border:none;cursor:pointer;text-align:left;{item.nada === 'bahaya'
				? 'border-left:4px solid var(--danger)'
				: ''}"
			onclick={() => toast.dismiss(item.id)}
		>
			{item.text}
		</button>
	{/each}
</div>
