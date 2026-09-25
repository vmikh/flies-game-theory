// Load only the experience appropriate for the current viewport.
export {};
const mobile = matchMedia('(max-width: 1349.98px)');
mobile.addEventListener('change', () => location.reload());

if (mobile.matches) await import('./mobile.ts');
else await import('./main.ts');
