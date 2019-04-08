export interface IPage extends IPageAbstract {
  content?: string;
  data?: any;
}

export interface IPageAbstract {
  date: string;
  slug: string;
  title: string;
  blurb: string;
}

export interface IStyle {
  name: string;
  content: string;
  url: string;
}

export interface IConfig {
  title: string;
  description: string;
  url: string;
}

export interface ITemplateData {
  config: IConfig,
  buildDate: string;
  template?: {
    assets: { [partialName: string]: IStyle };
  };
}

export interface IConstants {
  distDirectory: string;
  templatePath: string;
  contentPath: string  
}
