<script lang="ts">
	interface Props {
		ukuran?: number;
		judul?: string;
	}

	let { ukuran = 15, judul = 'Email terverifikasi' }: Props = $props();
</script>

<span
	role="img"
	aria-label={judul}
	title={judul}
	style="display:inline-flex;flex:none;vertical-align:middle;width:{ukuran}px;height:{ukuran}px"
>
	<svg viewBox="0 0 24 24" width={ukuran} height={ukuran} aria-hidden="true">
		<path
			d="M12 1.5l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.3L12 22.5l-2.4-2.1-3.2.3-.9-3.1L2.7 16l1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.3z"
			fill="var(--centang-biru, #2b7fd4)"
		/>
		<path
			d="M7.6 12.2l3 3 5.8-6"
			fill="none"
			stroke="#fff"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</span>
