<script lang="ts">
	interface Props {
		ukuran?: number;
	}

	let { ukuran = 26 }: Props = $props();
</script>

<!-- Digambar ulang dari logo.png: PNG-nya jadi keruh di ukuran navbar. -->
<svg
	viewBox="0 0 32 32"
	width={ukuran}
	height={ukuran}
	role="img"
	aria-label="Cloister"
	style="flex:none;display:block"
>
	<rect x="3" y="6.5" width="26" height="23" rx="6" fill="#E8A33A" />
	<rect x="5.6" y="9.6" width="20.8" height="17.4" rx="3.6" fill="#FBF6EA" />
	<path d="M5.6 24.2h20.8v-1.4H5.6z" fill="#000" opacity="0.06" />
	<path
		d="M20.6 12.4l4.4 1.5v3.9c0 2.6-1.7 4.7-4.4 5.6-2.7-.9-4.4-3-4.4-5.6v-3.9z"
		fill="#1F8A7C"
	/>
	<rect x="19.3" y="17.1" width="2.6" height="2.6" rx="0.6" fill="#FBF6EA" />
	<path
		d="M19.7 17.1v-.9a.9.9 0 0 1 1.8 0v.9"
		fill="none"
		stroke="#FBF6EA"
		stroke-width="0.85"
	/>
	<path d="M16 4.4v5.4" stroke="#B4B7BC" stroke-width="1.5" stroke-linecap="round" />
	<circle cx="16" cy="4" r="3" fill="#F0703C" />
	<circle cx="15" cy="3" r="1" fill="#fff" opacity="0.45" />
</svg>
