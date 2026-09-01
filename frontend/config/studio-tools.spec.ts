import { STUDIO_CATEGORIES, STUDIO_TOOLS, toolsForCategory } from './studio-tools';

describe('AI Studio registry', () => {
  it('defines the complete audited catalog and keeps backend gaps visible', () => {
    expect(new Set(STUDIO_TOOLS.map((tool) => tool.id)).size).toBe(STUDIO_TOOLS.length);
    expect(STUDIO_CATEGORIES).toEqual(['Understand', 'Create', 'Media', 'Visualize', 'Utilities']);
    expect(STUDIO_TOOLS.find((tool) => tool.id === 'presentation-generator')).toMatchObject({ availability: 'available' });
  });

  it('keeps every tool in a supported non-empty category', () => {
    for (const category of STUDIO_CATEGORIES) {
      expect(toolsForCategory(category).length).toBeGreaterThan(0);
    }
    expect(STUDIO_TOOLS.every((tool) => STUDIO_CATEGORIES.includes(tool.category))).toBe(true);
  });
});
