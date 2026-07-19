/** Morse Code — Expert manual renderer (the device itself is 3D). */
export const morse = {
  renderManual(el, manual) {
    let html = `<p class="manual-intro">${manual.intro}</p>`;
    html += `<h3>Morse Alphabet</h3><div class="morse-chart">`;
    for (const [letter, code] of Object.entries(manual.alphabet)) {
      html += `<div><b>${letter}</b> ${code.replace(/\./g, '·').replace(/-/g, '−')}</div>`;
    }
    html += `</div><h3>Frequency Table</h3><table class="manual-table"><tr><th>Word</th><th>Frequency</th></tr>`;
    for (const row of manual.table) {
      html += `<tr><td>${row.word}</td><td>${row.freq}</td></tr>`;
    }
    html += `</table>`;
    el.innerHTML = html;
  }
};
