/**
 * Render a consistent error state into the loading container.
 */
export function showErrorScreen(
  message: string,
  error?: unknown,
  title: string = 'Error'
): void {
  const loadingEl = document.getElementById('loading')
  if (!loadingEl) return

  const errorDetails =
    import.meta.env.DEV && error
      ? `<pre style="margin-top: 1rem; text-align: left; font-size: 0.75rem; color: #fbbf24; max-width: 600px; overflow: auto;">${
          error instanceof Error ? error.stack : String(error)
        }</pre>`
      : ''

  loadingEl.innerHTML = `
    <div style="text-align: center; color: #ef4444;">
      <h2 style="margin-bottom: 1rem;">⚠️ ${title}</h2>
      <p style="margin-bottom: 1rem;">${message}</p>
      <button
        onclick="location.reload()"
        style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        Reload Page
      </button>
      ${errorDetails}
    </div>
  `
  loadingEl.classList.remove('hidden')
}
