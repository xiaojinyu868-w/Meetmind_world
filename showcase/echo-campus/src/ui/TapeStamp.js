// Styles: ./tape-stamp.css (imported by main.js, so this module stays testable in node).
const MONTHS = ["JAN.", "FEB.", "MAR.", "APR.", "MAY", "JUN.", "JUL.", "AUG.", "SEP.", "OCT.", "NOV.", "DEC."];

/** "PM 5:42  OCT. 08 2026", the way a tape deck prints the moment. */
export function stampDate(date = new Date()) {
  const hours = date.getHours(), minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours < 12 ? "AM" : "PM"} ${hours % 12 || 12}:${minutes}  ${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")} ${date.getFullYear()}`;
}

let el = null, timer = 0, pending = null;

/**
 * The tape stamp over the picture: `play` top left, `date` bottom left (may
 * hold a second line), one tracking band down the screen, then a 0.6 s fade.
 * Resolves when it has gone; never takes a tap.
 */
export function showStamp({ play = "PLAY ▶", date = stampDate(), hold = 1600 } = {}) {
  if (!el) {
    el = document.createElement("div");
    el.className = "tape-stamp";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<b class="tape-play"></b><b class="tape-date"></b><i class="tape-band"></i>';
    document.body.appendChild(el);
  }
  el.querySelector(".tape-play").textContent = play;
  el.querySelector(".tape-date").textContent = date;
  clearTimeout(timer);
  pending?.();
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
  return new Promise(resolve => {
    pending = resolve;
    timer = setTimeout(() => { el.classList.remove("on"); timer = setTimeout(() => { pending = null; resolve(); }, 600); }, hold);
  });
}
