export interface IPage {
  date?: string;
  slug?: string;
  amp_slug?: string;
  title: string;
  description: string;
}

export interface IStyle {
  name: string;
  content: string;
}

export interface IConfig {
  title: string;
  description: string;
  url: string;
  outPath?: string;
  redirects: { [source: string]: string };
}

export interface ITemplateData {
  config: IConfig;
  buildDate: string;
  template?: {
    assets: { [partialName: string]: IStyle };
  };
  content?: string;
  page?: IPage;
  pages?: Array<IPage>;
}

export interface IConstants {
  distDirectory: string;
  contentPath: string;
}
