// Config found in _config.yml files
export interface IConfig {
  site_title: string;
  site_description: string;
  site_url: string;
  site_author: string;
  dist_path?: string;
}

// Config found in .md front-matter
export interface IFrontMatter {
  title: string;
  description: string;
  date: string;
  year: string;
  path: string;
  slug: string;
  type: string;
  layout: string;
  excerpt: string;
  content_html?: string;
  permalink?: string; // alias for "slug"
}

// Config combined with front matter
export interface IPageConfig extends IConfig, IFrontMatter {
  filename: string;
  source: string;    
  path_amp?: string;
}

// Config that gets passed into the compiled template
export interface ITemplateData extends IPageConfig {
  styles?: { [partialName: string]: IStyle };
}

export interface IContentSource {
  data: IFrontMatter;
  html: string;
}

export interface IStyle {
  name: string;
  path: string;
  content: string;
}
