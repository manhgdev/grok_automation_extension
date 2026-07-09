/** CSP-safe early theme — loaded from panel/index.html before CSS. */
(function () {
  try {
    const theme = localStorage.getItem('veo-ui-theme');
    if (theme === 'light') {
      document.documentElement.style.colorScheme = 'light';
      return;
    }
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } catch {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
