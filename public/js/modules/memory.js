/** Memory Sequence — Expert manual renderer (the device itself is 3D). */
export const memory = {
  renderManual(el, manual) {
    let html = `<p class="manual-intro">${manual.intro}</p>`;
    for (const stage of manual.stages) {
      html += `<h3>${stage.title}</h3><ul>${stage.rules.map((r) => `<li>${r}</li>`).join('')}</ul>`;
    }
    el.innerHTML = html;
  }
};
