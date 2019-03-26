export interface IPage extends IPageAbstract {
  content?: string;
  data?: any;
}

export interface IPageAbstract {
  date: string;
  slug: string;
  title: string;
}

export interface ITemplateDataSite {
  name: string;
  description: string;
  baseurl: string;
  buildTime: string;
}

export interface ITemplateData {
  site: ITemplateDataSite
  template: { [partialName: string]: string };  
}

export interface IConstants{  
  distPath: string;
  templatePath: string;
  contentPath: string;
  postsDirectoryName: string;
}