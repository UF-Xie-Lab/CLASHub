(function() {
  // Smooth-scroll for in-page anchors
  document.querySelectorAll('a.toc-link, .back-top a').forEach(function(a) {
    a.addEventListener('click', function(e) {
      if (a.hash) {
        e.preventDefault();
        document.querySelector(a.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', a.hash);
      }
    });
  });

  // Copy buttons for example tokens
  document.querySelectorAll('button.copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var text = btn.getAttribute('data-copy') || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function(){ btn.textContent = orig; }, 1200);
      }).catch(function() {
        // Fallback: temporary input
        var tmp = document.createElement('input');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(tmp);
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function(){ btn.textContent = orig; }, 1200);
      });
    });
  });

  // Simple scroll spy to highlight current section in the TOC
  var headings = Array.from(document.querySelectorAll('article.tutorial-content section[id]'));
  var tocLinks = Array.from(document.querySelectorAll('.toc a.toc-link'));
  function onScroll() {
    var scrollPos = window.scrollY || window.pageYOffset;
    var current = headings[0]?.id;
    for (var i = 0; i < headings.length; i++) {
      var rect = headings[i].getBoundingClientRect();
      var top = rect.top + window.scrollY - 120; // offset for header/nav
      if (scrollPos >= top) current = headings[i].id;
    }
    tocLinks.forEach(function(link) {
      if (link.hash === '#' + current) link.classList.add('active');
      else link.classList.remove('active');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
})();