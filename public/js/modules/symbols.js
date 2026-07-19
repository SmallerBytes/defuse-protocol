/** Symbol Matching — Expert manual renderer (the device itself is 3D). */
export const symbols = {
  renderManual(el, manual) {
    let html = `<p class="manual-intro">${manual.intro}</p><div class="manual-columns">`;
    manual.columns.forEach((col, i) => {
      html += `<div class="manual-col"><div class="col-head">COL ${i + 1}</div>`;
      html += col.map((g) => `<div class="glyph">${g}</div>`).join('');
      html += `</div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  }
};
