# xertz  ![Build Status](https://github.com/bradymholt/xertz/workflows/Build/badge.svg)

> Pronounced ‘zerts’, it means to gulp something down quickly and/or in a greedy fashion

xertz is a static site generator with first-class support for Markdown and Handlebars templates

## Installation and Usage

xertz requires Node.js to be installed and is distributed on [npm](https://npmjs.com).  It can easily be installed and executed by using the [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) tool, which is distributed with newer versions of Node.js.

### Commands

`npx xertz init [folder_name]` - Initializes a new xertz project

`npx xertz new [Post Title]` - Create a new folder in posts/.

`npx xertz serve` - Builds and serves a xertz project on http://localhost:8080.  Also watches and rebuilds on any changes.

`npx xertz build` - Buids a xertz project and outputs to `_dist` folder.

## Features

- First class support for SaSS, Markdown and Handlebars templating
- Built in support for AMP
- Code Highligting via Prism.js

## Directory Structure

When you initialize a xertz site, a directory will created that looks like this:

```
|-- my_site
  |-- _layouts
  |-- media
  |-- posts
  |-- styles
  |-- _config.yml
  |-- index.html.hbs
```

- *_layouts* - This folder contains Handlebars layouts which will be used to contruct rendered pages.
- *media* - This is folder that is indented to hold images and other assets.  The folder will be emitted as is.
- *posts* - This is folder that is indented to blog posts.
- *styles* - CSS files can be placed here and will be be made available in the template data.
- *_config.yml* - This is the base config file.
- *index.html.hbs* - This is the main index page for the site.

### Config

Configuration comes from one of these places, in order of precedence:

- Root _config.yml
- _config.yml file in content directory or subdirectory
- Markdown file yaml Front Matter

### Templates

A file with the `html.hbs` extension will be processed as a Handlebars template and have access to `pages` data which will be an array of all pages in the current and subdirectories.

### Markdown

- A file can have a date prefix in its name which will set the `date` variable.
- By default, the name of the file (minus any date prefix) will be used as the `slug` variable and effect the output path.

#### Content Package Directory

If subdirectory of `content/` contans contains a file called `index.md`, it will be deemed a Content Package Directory.  This means all files within the directory will be 

For example, if you had a directory structure defined as:

```
|-- content
  |-- 2019-03-13-crazy-pets
    |-- index.md
    |-- catz_lol.jpg
    |-- doggy_do_little.jpg  
```

The `2019-03-13-crazy-pets/` folder is considered a Content Package Directory.  It would be output as:

```
|-- crazy-pets
  |-- index.html
  |-- catz_lol.jpg
  |-- doggy_do_little.jpg  
```

and accessible at https://youdomain.com/crazy-pets/

### Layouts

Any file with a `_` prefix is ignored.

### Styles

CSS and SaSS can be placed within any folder but when it is placed in the `styles/` folder you have access to the styles within templates.  This is useful, for example, if you want to inline your styles within a template with `<style/>` rather than linking to a path with `<link rel="stylesheet"/>`.

Any file with a `_` prefix is ignored.

## Handlebars Helpers

The following Handlebars helpers are made available in xertz:

- limit - `{{ limit pages 15 }}`
- filter - `{{ filter pages "type" "post" }}`
- iif - `{{ iif excerpt site_description }}`
- dateFormat - `{{ dateFormat "now" "yyyy" }}`
- indent - `{{{ indent my_text 4 }}}`
- group - `{{#group pages by="year"}}`
- encodeURI - `{{#encodeURI site_url}}`


