/**
 * Polite screen-reader announcements for actions that change the page without
 * moving focus (Lab mode, copy to clipboard). The live region is rendered once
 * by the app shell.
 */
let region: HTMLElement | null = null;

export const registerAnnouncer = (el: HTMLElement | null) => {
  region = el;
};

export function announce(text: string) {
  if (!region) return;
  region.textContent = '';
  // A fresh text node after a tick, so repeating the same message is still read.
  window.setTimeout(() => {
    if (region) region.textContent = text;
  }, 60);
}
