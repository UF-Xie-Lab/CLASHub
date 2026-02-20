// Smooth scrolling for in-page anchors and updated scrollspy for the Table of Contents
(function() {
  // Utility function to execute once DOM is fully loaded
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  ready(function() {
    // Implement smooth scrolling for all internal anchor links
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    
    internalLinks.forEach(function(anchor) {
      anchor.addEventListener('click', function(event) {
        const targetId = anchor.getAttribute('href').slice(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        event.preventDefault();
        
        // Scroll target into view smoothly
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update URL hash without jumping the page
        try { 
          history.pushState(null, '', '#' + targetId); 
        } catch (error) {
          // Fallback if History API fails
        }
      });
    });

    // Scrollspy: highlight the current section in the Table of Contents (TOC)
    // Fixed: Now accurately targets the '.toc a' links based on the provided HTML
    const tocLinks = document.querySelectorAll('.toc a[href^="#"]');
    const linksById = {};
    
    // Map section IDs to their corresponding TOC link elements
    tocLinks.forEach(function(link) {
      const targetId = link.getAttribute('href').slice(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        linksById[targetId] = link;
      }
    });

    // IntersectionObserver to detect which section is currently active
    const observerOptions = { 
      rootMargin: '0px 0px -70% 0px', 
      threshold: 0.1 
    };

    const sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        const currentId = entry.target.id;
        const activeLink = linksById[currentId];
        
        if (!activeLink) return;
        
        // Add or remove 'active' class based on visibility
        if (entry.isIntersecting) {
          // Clear active state from all links first
          tocLinks.forEach(function(link) { 
            link.classList.remove('active'); 
          });
          // Set active state on the currently visible section link
          activeLink.classList.add('active');
        }
      });
    }, observerOptions);

    // Attach observer to all mapped sections
    Object.keys(linksById).forEach(function(id) {
      const sectionElement = document.getElementById(id);
      if (sectionElement) {
        sectionObserver.observe(sectionElement);
      }
    });

    // Automatically open external HTTP/HTTPS links in a new browser tab for better UX
    document.querySelectorAll('a[href^="http"]').forEach(function(externalLink) {
      externalLink.setAttribute('target', '_blank');
      externalLink.setAttribute('rel', 'noopener noreferrer');
    });
  });
})();