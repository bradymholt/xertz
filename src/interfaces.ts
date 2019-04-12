export interface IConfig {
  title: string;
  description: string;
  url: string;
  build_timestamp: string;
  google_analytics_id: string;
  outPath?: string;
  redirects: { [source: string]: string };
}

export interface IContentSource {
  data: {
    [key: string]: any;
  };
  html: string;
  excerpt: string;
}

export interface IPage {
  title: string;
}

export interface IContentPage extends IPage {
  date?: string;
  excerpt: string;
  path: string;
  path_amp?: string;
}

export interface IStyle {
  name: string;
  content: string;
}

export interface ITemplateData {
  config: IConfig;
  template?: {
    assets: { [partialName: string]: IStyle };
  };
  content?: string;
  page?: IContentPage;
  pages?: Array<IContentPage>;
}

export interface IConstants {
  distDirectory: string;
  contentPath: string;
}
