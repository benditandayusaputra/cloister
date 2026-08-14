<script lang="ts">
	interface Props {
		label: string;
		x?: number | null;
		y?: number | null;
		onpilih: () => void;
	}

	let { label, x = null, y = null, onpilih }: Props = $props();
	const posisi = $derived(x === null || y === null ? '' : `position:absolute;left:${x}px;top:${y}px;z-index:2`);
</script>

<li style={posisi}>
	<button
		type="button"
		aria-label={label}
		title={label}
		style="cursor:pointer;width:44px;height:44px;display:grid;place-items:center;border:none;background:transparent;border-radius:var(--r-control)"
		onclick={onpilih}
	>
		<span class="lubang-pin"></span>
	</button>
</li>
