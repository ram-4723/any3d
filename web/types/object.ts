export type Localized = { en: string; hi: string };
export type Spec = { label: Localized; value: string | number; unit: string };
export type Fact = { text: Localized; sourceUrl: string; sample?: boolean };
export type ObjectEntry = { slug: string; name: Localized; category: string; tagline: Localized; summary: Localized; specs: Spec[]; funFacts: Fact[]; celebrityLinks: { person: string; relation: Localized; sourceUrl: string; sample?: boolean }[]; rarity?: string; hasFramePack: boolean; tags: string[]; sample?: boolean };
