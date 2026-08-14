<script lang="ts">
	import { renderAman, resolusiLampiran } from '$lib/utils/markdown-aman.ts';

	interface Props {
		md: string;
		kelas?: string;
		/**
		 * Peta id lampiran → blob URL hasil dekripsi, untuk sintaks
		 * `![alt](lampiran:<id>)`. Tanpa peta ini, referensi lampiran dirender
		 * tanpa src (alt-nya tetap tampil) — bukan sebagai jalur injeksi.
		 */
		urls?: Record<string, string>;
	}

	let { md, kelas = 'prosa', urls = {} }: Props = $props();

	// Satu-satunya tempat {@html} diizinkan; isinya selalu lewat DOMPurify
	// di dalam renderAman. Pipeline lengkapnya diuji di
	// tests/unit/markdown-aman.test.ts.
	const html = $derived(renderAman(resolusiLampiran(md, urls)));
</script>

<div class={kelas}>
	{@html html}
</div>
