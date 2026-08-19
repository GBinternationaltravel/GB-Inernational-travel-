export interface DestinationSummary {
  slug: string;
  name: string;
  country: string;
  summary: string;
  isDomestic: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
