/** Logic Grid — Expert manual renderer (fixed roster; clues are on the device). */
export const logicgrid = {
  renderManual(el, manual) {
    const e = manual.entities;
    let html = `<p class="manual-intro">${manual.intro}</p>`;
    if (manual.rosterNote) {
      html += `<p class="manual-intro"><em>${manual.rosterNote}</em></p>`;
    }
    html += `<h3>Roster</h3><table class="manual-table"><tr><th>Engineers</th><th>Panels</th><th>Shifts</th></tr>`;
    for (let i = 0; i < e.engineers.length; i++) {
      html += `<tr><td>${e.engineers[i]}</td><td>${e.panels[i]}</td><td>${e.shifts[i]}</td></tr>`;
    }
    html += `</table><h3>How to use</h3><ol class="clue-list">`;
    html += (manual.clues || []).map((c) => `<li>${c}</li>`).join('');
    html += `</ol>`;
    el.innerHTML = html;
  }
};
