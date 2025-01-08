export type SectionType = 
  | 'hero'
  | 'text'
  | 'image'
  | 'features'
  | 'testimonials'
  | 'cta';

export interface Section {
  id: string;
  type: SectionType;
  content: {
    title?: string;
    subtitle?: string;
    text?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    alignment?: 'left' | 'center' | 'right';
    features?: {
      title: string;
      description: string;
      icon?: string;
    }[];
    testimonials?: {
      content: string;
      author: string;
      role?: string;
      avatar?: string;
    }[];
    ctaText?: string;
    ctaLink?: string;
    background?: 'white' | 'light' | 'dark';
    width?: 'narrow' | 'medium' | 'full';
    layout?: 'full' | 'contained' | 'float-left' | 'float-right';
    altText?: string;
    caption?: string;
  };
  order: number;
}

export interface PageData {
  sections: Section[];
  meta: {
    lastUpdated: string;
    publishedVersion?: string;
  };
} 