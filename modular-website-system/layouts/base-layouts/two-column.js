/**
 * Two Column Base Layout
 * Main content area with sidebar for secondary information
 */

function render(components, contactData, preset) {
  // Separate components into main and sidebar based on priority
  const mainComponents = [];
  const sidebarComponents = [];

  components.forEach(component => {
    // Put contact info and social in sidebar, everything else in main
    if (component.name === 'contact' || component.name === 'social') {
      sidebarComponents.push(component);
    } else {
      mainComponents.push(component);
    }
  });

  const mainHTML = mainComponents
    .map(component => component.html)
    .join('\n\n');

  const sidebarHTML = sidebarComponents
    .map(component => component.html)
    .join('\n\n');

  return `
    <div class="layout-two-column">
      <main class="main-content">
        ${mainHTML}
      </main>
      
      ${sidebarHTML ? `
      <aside class="sidebar">
        ${sidebarHTML}
      </aside>` : ''}
    </div>
  `;
}

module.exports = {
  render,
  name: 'Two Column',
  description: 'Main content area with sidebar for contact info and social links'
};
