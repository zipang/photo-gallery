# Gallery Generator

A tool for professional photographers to self-host online galleries with full control over templates and styling.

## Overview

Gallery Generator is a static site generator specifically designed for creating beautiful online photography galleries. It allows photographers to maintain complete control over their digital presentations while providing flexibility in design and customization.

## Features

### Core Functionality
- Generate static HTML/CSS/JS galleries from image collections
- Responsive design templates optimized for photography
- Customizable themes and layouts
- Metadata extraction and display (EXIF data, captions, etc.)
- Automatic thumbnail generation
- Video support

### Advanced Features
- Search functionality
- Lightbox/galleria viewing experience

## Technical Requirements

### Stack
- bun package manager and javascript runtime
- Astro backend for generation engine
- React for dynamic frontend components
- Sass for styling
- Markdown for content management

### Deployment
- Deployment on various hosting platforms
- CDN compatibility

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun i  `                 | Installs dependencies                            |
| `bun dev`                 | Starts local dev server at `localhost:4321`      |
| `bun run build`           | Build your production site to `./dist/`          |
| `bun preview`             | Preview your build locally, before deploying     |
| `bun astro ...`           | Run CLI commands like `astro add`, `astro check` |
| `bun import medias`       | Import media from source directory               |

## 📁 Media Import Process

The gallery generator uses a media import script to process your photos and generate the gallery content:

```bash
# Import media from a specific directory
bun import /path/to/your/photos

# Or set the MEDIA_DIR environment variable
MEDIA_DIR=/path/to/your/photos bun import
```

The import script will:
1. Scan your media directory for photos and videos
2. Extract EXIF metadata from images
3. Copy optimized versions for a vignette and the full-size image in the local `assets/` folder
4. Create markdown files with gallery metadata inside `src/content/`

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).


