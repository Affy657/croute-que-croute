const WAIT_MS = 2500, FADE_MS = 600;
const loader = document.getElementById("loader");

/** @param {Promise<unknown>} board */
export function finishLoading(board) {
  const fonts = document.fonts ? document.fonts.ready : null;
  const cap = new Promise((ok) => setTimeout(ok, WAIT_MS));
  Promise.race([Promise.all([board, fonts]), cap]).then(() => {
    loader.style.setProperty("--load", "1");
    loader.classList.add("done");
    setTimeout(() => loader.remove(), FADE_MS);
  });
}
