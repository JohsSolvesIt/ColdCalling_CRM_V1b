/**
 * Hero-Focused Base Layout
 * Large prominent hero section with compact other sections below
 */

function render(components, contactData, preset) {
  const heroComponent = components.find(c => c.name === 'hero');
  const otherComponents = components.filter(c => c.name !== 'hero');

  // Group non-hero components compactly
  const compactComponents = otherComponents.map(component => {
    // Add compact modifier to component HTML
    const compactHTML = component.html.replace(
      /class="([^"]*)-component/g, 
      'class="$1-component $1-compact'
    );
    return compactHTML;
  });

  const heroHTML = heroComponent ? heroComponent.html : '';
  const compactHTML = compactComponents.join('\n\n');

  return `
    <div class="layout-hero-focused">
      ${heroHTML ? `
      <div class="hero-section">
        ${heroHTML}
      </div>` : ''}
      
      <div class="compact-content">
        ${compactHTML}
      </div>
    </div>
  `;
}

module.exports = {
  render,
  name: 'Hero Focused',
  description: 'Large hero section with compact content sections below'
};
