// Sets the theme before the panel draws, so it never flashes the wrong one.
// A file rather than an inline script: the panel's content policy runs no inline code.
try {
  var t = localStorage.getItem('vee-admin/theme');
  var dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
