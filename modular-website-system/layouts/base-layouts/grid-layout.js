/**
 * Grid Base Layout
 * CSS Grid-based layout for flexible component arrangement
 */

function render(components, contactData, preset) {
  // Organize components into grid areas
  const heroComponent = components.find(c => c.name === 'hero');
  const otherComponents = components.filter(c => c.name !== 'hero');

  // Split other components into two columns
  const leftColumn = [];
  const rightColumn = [];

  otherComponents.forEach((component, index) => {
    if (index % 2 === 0) {
      leftColumn.push(component);
    } else {
      rightColumn.push(component);
    }
  });

  const heroHTML = heroComponent ? heroComponent.html : '';
  const leftHTML = leftColumn.map(c => c.html).join('\n\n');
  const rightHTML = rightColumn.map(c => c.html).join('\n\n');

  return `
    <div class="layout-grid">
      ${heroHTML ? `
      <div class="grid-hero">
        ${heroHTML}
      </div>` : ''}
      
      <div class="grid-left">
        ${leftHTML}
      </div>
      
      <div class="grid-right">
        ${rightHTML}
      </div>
    </div>
  `;
}

module.exports = {
  render,
  name: 'Grid Layout',
  description: 'CSS Grid layout with hero section and balanced two-column content'
};
