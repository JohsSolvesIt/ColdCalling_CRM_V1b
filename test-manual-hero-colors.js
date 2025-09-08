#!/usr/bin/env node

/**
 * Test Manual Hero Text Color Controls
 * 
 * This script tests that the manual hero text color controls are working properly
 * and that the colors are being applied to the generated websites.
 */

const ModularWebsiteGenerator = require('./modular-website-system/engines/ModularWebsiteGenerator');

// Test data
const testContact = {
  id: 'test-manual-colors',
  name: 'Test Agent',
  email: 'test@example.com',
  phone: '(555) 123-4567',
  company: 'Test Real Estate'
};

// Test scenarios
const testScenarios = [
  {
    name: 'Default Automatic Colors (Inked Estate)',
    options: {
      manualHeroTextColors: false,
      heroOverlayWhite: false
    },
    expected: {
      heroTextColor: '#ffffff',
      heroTextSecondary: '#e0e0e0',
      heroAccentColor: '#7bb87b'
    }
  },
  {
    name: 'Manual White Text on Dark Background',
    options: {
      manualHeroTextColors: true,
      heroTextColor: '#ffffff',
      heroTextSecondary: '#e5e5e5',
      heroAccentColor: '#3b82f6'
    },
    expected: {
      heroTextColor: '#ffffff',
      heroTextSecondary: '#e5e5e5',
      heroAccentColor: '#3b82f6'
    }
  },
  {
    name: 'Manual Dark Text for Light Backgrounds',
    options: {
      manualHeroTextColors: true,
      heroTextColor: '#1a1a1a',
      heroTextSecondary: '#4a4a4a',
      heroAccentColor: '#2d5a2d'
    },
    expected: {
      heroTextColor: '#1a1a1a',
      heroTextSecondary: '#4a4a4a',
      heroAccentColor: '#2d5a2d'
    }
  },
  {
    name: 'Manual Red Text Theme',
    options: {
      manualHeroTextColors: true,
      heroTextColor: '#dc2626',
      heroTextSecondary: '#ef4444',
      heroAccentColor: '#f87171'
    },
    expected: {
      heroTextColor: '#dc2626',
      heroTextSecondary: '#ef4444',
      heroAccentColor: '#f87171'
    }
  }
];

async function runTests() {
  console.log('🧪 Testing Manual Hero Text Color Controls\n');

  const generator = new ModularWebsiteGenerator();

  for (const scenario of testScenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log('   Options:', JSON.stringify(scenario.options, null, 4));

    try {
      // Generate website with test options
      const result = generator.generateWebsite(
        testContact,
        'professional',
        'inked-estate',
        scenario.options
      );

      if (result.success) {
        const html = result.html;

        // Check if the expected colors are present in the generated HTML
        let allColorsFound = true;
        const foundColors = {};

        for (const [colorVar, expectedColor] of Object.entries(scenario.expected)) {
          const regex = new RegExp(`--hero-text-color:\\s*${expectedColor.replace('#', '\\#')}|${colorVar.replace(/([A-Z])/g, '-$1').toLowerCase()}:\\s*${expectedColor.replace('#', '\\#')}`, 'i');
          if (html.match(regex)) {
            foundColors[colorVar] = expectedColor;
          } else {
            // Also check for the color value directly
            if (html.includes(expectedColor)) {
              foundColors[colorVar] = expectedColor;
            } else {
              allColorsFound = false;
              console.log(`   ❌ Expected ${colorVar}: ${expectedColor} - NOT FOUND`);
            }
          }
        }

        if (allColorsFound) {
          console.log(`   ✅ All expected colors found in generated HTML`);
          Object.entries(foundColors).forEach(([var_, color]) => {
            console.log(`      ${var_}: ${color}`);
          });
        } else {
          console.log(`   ⚠️  Some colors missing from generated HTML`);
        }

      } else {
        console.log(`   ❌ Website generation failed: ${result.error}`);
      }

    } catch (error) {
      console.log(`   ❌ Test failed with error: ${error.message}`);
    }
  }

  console.log('\n🏁 Manual Hero Text Color Tests Complete\n');
}

// Run the tests
runTests().catch(console.error);
