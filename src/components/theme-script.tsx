/**
 * Server-rendered inline script that sets `class="dark"` on <html>
 * BEFORE hydration to avoid flash-of-wrong-theme.
 *
 * Read order: localStorage("theme") -> prefers-color-scheme -> "dark".
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
