// Page switcher shared by every playground page.
const PAGES: Record<string, string> = {
  design: "./",
  paint: "./paint.html",
  mixer: "./mixer.html",
  assets: "./assets.html",
};

for (const nav of document.querySelectorAll<HTMLElement & { value: string }>(".page-nav")) {
  nav.addEventListener("change", () => {
    location.href = PAGES[nav.value] ?? "./";
  });
}
