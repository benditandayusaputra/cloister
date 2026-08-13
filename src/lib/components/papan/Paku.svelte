<script lang="ts">
	import { pinOf } from '$lib/utils/kertas.ts';

	interface Props {
		mood?: number | null;
		ukuran?: number;
		geser?: number;
		berkedip?: boolean;
		absolut?: boolean;
	}

	let { mood = 3, ukuran = 19, geser = 0, berkedip = false, absolut = true }: Props = $props();
</script>

<span
	aria-hidden="true"
	class="pin-bulat"
	style="{absolut
		? `position:absolute;left:50%;top:-${Math.round(ukuran / 2)}px;z-index:4;margin-left:${geser}px;transform:translateX(-50%);`
		: 'display:inline-block;'}width:{ukuran}px;height:{ukuran}px;background:{pinOf(
		mood
	)};{berkedip ? 'animation:bd-pulse 2400ms var(--ease-quiet) infinite;' : ''}"
></span>
