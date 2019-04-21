declare module "*package.json" {
  const value: {
    name: string;
    description: string;
    version: string;
  };
  export = value;
}
