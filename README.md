# xertz

> Pronounced ‘zerts’, it means to gulp something down quickly and/or in a greedy fashion

xertz is a static site generator with first-class support for Markdown and Handlebars templates

## Installation and Usage

xertz requires Node.js to be installed and is distributed on [npm](https://npmjs.com).  It can easily be installed and executed by using the [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) tool, which is distributed with newer versions of Node.js.

### Commands

`npx xertz init [folder_name]` - Initializes a new xertz project

`npx xertz serve` - Builds and serves a xertz project on http://localhost:8080.  Also watches and rebuilds on any changes.

`npx xertz build` - Buids a xertz project and outputs to `_dist` folder.

## Features

- Built in support for AMP
- Code Highligting via Prism.js
- Style content available in templates
- Supports SaSS

## Content Files

- TODO

## Config

- TODO

## Layouts

- Files prefixes with _ are not processed
- TODO

## Template Helpers

- limit, filter, iif, dateFormat (now)
- TODO
