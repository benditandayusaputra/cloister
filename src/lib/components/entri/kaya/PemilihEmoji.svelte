<script lang="ts">
	interface Props {
		onpilih: (emoji: string) => void;
	}

	let { onpilih }: Props = $props();

	const KELOMPOK: Array<{ label: string; isi: string[] }> = [
		{
			label: 'Wajah',
			isi: ['😀', '😄', '😅', '😂', '🥲', '😊', '😍', '🤩', '😎', '🤔', '😴', '😭', '😤', '🥳', '🤗', '🙃', '😌', '🥺', '😇', '🤯', '😱', '🫠', '😷', '🤒']
		},
		{
			label: 'Hati & simbol',
			isi: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '✨', '⭐', '🔥', '💯', '✅', '❌', '⚠️', '❗', '❓', '💡', '📌', '📍', '🔖', '🔒', '🔑']
		},
		{
			label: 'Alam',
			isi: ['🌱', '🌸', '🌻', '🌿', '🍀', '🌧️', '☀️', '🌙', '⛰️', '🌊', '🌈', '❄️', '🍂', '🐱', '🐶', '🐦', '🦋', '🌍']
		},
		{
			label: 'Kegiatan',
			isi: ['☕', '🍜', '🍰', '🎂', '🎉', '🎧', '🎬', '🎮', '📚', '✏️', '📷', '🚲', '✈️', '🏠', '💼', '💻', '🏃', '🧘', '🛌', '🛒', '💊', '🎓', '💰', '📅']
		}
	];
</script>

<div
	role="listbox"
	aria-label="Pilih emoji"
	class="kertas kertas-angkat muncul panel"
>
	{#each KELOMPOK as k (k.label)}
		<span class="t-data t-data-ink label">{k.label}</span>
		<div class="grid">
			{#each k.isi as e (e)}
				<button
					type="button"
					role="option"
					aria-selected="false"
					aria-label="Emoji {e}"
					class="emo"
					onmousedown={(ev) => {
						ev.preventDefault();
						onpilih(e);
					}}>{e}</button
				>
			{/each}
		</div>
	{/each}
</div>

<style>
	.panel {
		position: absolute;
		z-index: 30;
		top: calc(100% + 6px);
		left: 0;
		width: min(340px, calc(100vw - 32px));
		max-height: 300px;
		overflow-y: auto;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.label {
		margin-top: 6px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
		gap: 2px;
	}
	.emo {
		cursor: pointer;
		min-height: 34px;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		font-size: 1.15rem;
		line-height: 1;
	}
	.emo:hover {
		background: rgb(27 27 23 / 0.1);
	}
</style>
