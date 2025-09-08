/**
 * Single Column Base Layout
 * Simple top-to-bottom layout for all components
 */

function render(components, contactData, preset) {
  const componentHTML = components
    .map(component => component.html)
    .join('\n\n');

  return `
    <div class="layout-single-column">
      <main class="main-content">
        ${componentHTML}
      </main>
    </div>
  `;
}

module.exports = {
  render,
  name: 'Single Column',
  description: 'Simple vertical layout with all components stacked top to bottom'
};
