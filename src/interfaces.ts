// Config found in _config.yml files
export interface IConfig {
  site_title: string;
  site_description: string;
  site_url: string;
  site_author: string;
  base_path?: string;
  redirects: { [source: string]: string };

  build_timestamp: string;
}

// Config found in .md front-matter
export interface IFrontMatter {
  title: string;
  description: string;
  date: string;
  path: string,
  slug: string;
  type: string;
  excerpt: string;
  
  path_amp: string,
  permalink?: string // alias for "slug"
}

// Config combined with front matter
export interface IPageConfig extends IConfig, IFrontMatter {}

// Config that gets passed into the compiled template
export interface ITemplateData extends IPageConfig {
  styles?: { [partialName: string]: IStyle };
  content?: string;
}

export interface IContentSource {
  data: IFrontMatter;
  html: string;
  excerpt: string;
}

export interface IStyle {
  name: string;
  content: string;
}
