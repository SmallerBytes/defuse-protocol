/** Wire Cutting — Expert manual renderer (the device itself is 3D). */
export const wires = {
  renderManual(el, manual) {
    let html = `<p class="manual-intro">${manual.intro}</p>`;
    for (const sec of manual.sections) {
      html += `<h3>${sec.title}</h3><ol>${sec.rules.map((r) => `<li>${r}</li>`).join('')}</ol>`;
    }
    el.innerHTML = html;
  }
};
