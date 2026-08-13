<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	interface Props {
		md: string;
		kelas?: string;
	}

	let { md, kelas = 'prosa' }: Props = $props();

	const ALLOWED_TAGS = [
		'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'blockquote',
		'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
	];

	// Satu-satunya tempat {@html} diizinkan; isinya selalu lewat DOMPurify.
	const html = $derived.by(() => {
		const raw = marked.parse(md ?? '', { async: false, gfm: true, breaks: true });
		return DOMPurify.sanitize(raw, {
			ALLOWED_TAGS,
			ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'target'],
			ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/(?!\/)|blob:)/i,
			FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
			FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
		}).replace(
			/<a\s+href="(https?:\/\/[^"]+)"/gi,
			'<a href="$1" rel="noopener noreferrer nofollow" target="_blank"'
		);
	});
</script>

<div class={kelas}>
	{@html html}
</div>
