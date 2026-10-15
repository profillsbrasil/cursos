setTimeout(() => {
  const r = [];
  document.querySelectorAll(".ed-mestre").forEach((m) => {
    const d = m.querySelector(".detalhe");
    const s = d.closest(".escala").clientWidth / 1280;
    r.push([m.className, Math.round(m.scrollWidth), Math.round(m.clientWidth), Math.round(d.getBoundingClientRect().width / s), d.scrollWidth].join(":"));
    let w = null;
    d.querySelectorAll("*").forEach((x) => {
      const b = x.getBoundingClientRect().width / s;
      if (b > d.clientWidth + 1 && !w) w = `${x.className}/${x.tagName}/${Math.round(b)}`;
    });
    r.push(`largo:${w}`);
  });
  document.body.dataset.r = r.join(" | ");
}, 800);
