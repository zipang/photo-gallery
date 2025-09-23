# Codebase Information for Crush

## Project Overview
- Photo gallery static site generator using Astro, React, and TypeScript
- Generates static HTML pages with interactive slideshow functionality
- Uses SimpleLightbox for image slideshow viewer

## Technology Stack
- **Framework**: Astro v5.13.9
- **Frontend**: React with TypeScript
- **Styling**: CSS (not specified yet)
- **Build Tool**: Bun package manager
- **Image Processing**: sharp, mozjpeg, exifr
- **Slideshow**: simplelightbox v2.14.3

## Project Structure
```
/
├── assets/                 # Processed images (vignettes and full-size)
├── src/
│   ├── components/         # React components (Vignette.tsx, GaleryView.tsx)
│   ├── content/            # Gallery data in markdown files
│   └── pages/              # Astro page templates
├── scripts/                # Import and processing scripts
└── public/                 # Static assets
```

## Key Directories
- `assets/`: Contains processed gallery images organized by gallery name
- `src/content/galleries/`: Markdown files with gallery metadata
- `src/components/`: React components for UI elements

## Commands
- `bun dev`: Start development server
- `bun build`: Build production site
- `bun import`: Import media from source directory
- `bun preview`: Preview production build locally

## Component Structure
- `Vignette.tsx`: Display a single thumbnail image with an optional border
- `GaleryView.tsx`: Main gallery view component : contains the vignettes
- `Breadcrumb.tsx`: Display the current path of the galery (galeries can be nested)
- `Slideshow`: takes a list of assets and create a lightbox with them using the jquery SimpleLightbox plugin

## Data Flow
1. Media import script processes original images
2. Creates vignettes and full-size images in `assets/`
3. Generates markdown files in `src/content/galleries/`
4. Astro builds static pages using content collections
5. SimpleLightbox provides interactive slideshow

## Code Style
Read the [Guide for coding agents.md](Guide for coding agents)
