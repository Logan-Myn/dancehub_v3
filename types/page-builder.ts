export type SectionType = 
  | 'hero'
  | 'text'
  | 'image'
  | 'features'
  | 'testimonials'
  | 'cta';

export interface Section {
  id: string;
  type: string;
  content: {
    title?: string;
    subtitle?: string;
    text?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    ctaText?: string;
    ctaLink?: string;
    buttonType?: 'link' | 'join';
    layout?: string;
    altText?: string;
    caption?: string;
  };
}

export interface PageData {
  sections: Section[];
  meta: {
    lastUpdated: string;
    publishedVersion?: string;
  };
} 