# Technical Specifications

## Media Import Process

### Directory Structure
The gallery generator will import media by linking to a directory containing the original media files. The structure is as follows:

```
(link to external media folder)/
├── Gallery 1/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── video1.mp4
├── Gallery 2/
│   ├── image1.jpg
│   └── Subgallery/
│       └── image2.jpg
└── Gallery 3/
    ├── image1.jpg
    └── image2.jpg
```

### Import Process
1. The system will scan the linked `media` directory recursively
2. Each top-level folder becomes a gallery in the navigation menu
3. Subfolders create nested galleries or categories
4. EXIF Data extraction
5. Supported formats: JPG, PNG, GIF, WEBP for images; MP4, WEBM, MOV for videos

## EXIF Data Extraction

### Required EXIF Information
During the scanning process, the following EXIF data will be extracted from compatible image files:

- **GPS coordinates**: (latitude/longitude)
- **Date and Time**: Creation timestamp
- **Camera Model**: Make and model of the camera used
- **Lens Model**: Lens information if available
- **ISO Setting**: Sensor sensitivity value
- **Shutter Speed**: Exposure time
- **Aperture**: f-number value
- **Focal Length**: Lens focal length used

**IMPORTANT:** An API call to Google places or a similar API should return the place name that is added as the **Location** field and will be used for the display name.

### File manipulation
With the extraction of these EXIF data, we are able to rename the files according to a scheme : `${isoDateTime}_${location}.${ext}`.
These files are then copied inside the `assets/` directory in two variants : a resized vignette, and the full size version suitable for the slideshow display mode, that is stored inside the `fullsize_` subfolder of the gallery folder.
The vignette are resized according to the passed parameter `vignette_width=640`.
The full sized version are optimized with [mozjpeg](https://github.com/mozilla/mozjpeg) with a quality of `jpeg_quality=75` (another parameter that can be passed through the command line or via the environnement variables).

Example of the imported assets tree:

```
assets/
├── Gallery 1/
│   ├── YYYYMMDD_HHMMSS_location_vignette.jpg
│   ├── ...
│   └── _fullsize/
│       └── YYYYMMDD_HHMMSS_location.jpg
├── Gallery 2/
│   ├── YYYYMMDD_HHMMSS_location_vignette.jpg
│   ├── ...
│   ├── _fullsize/
│   │   └── YYYYMMDD_HHMMSS_location.jpg
│   └── Subgallery/
│       ├── YYYYMMDD_HHMMSS_location_vignette.jpg
│       ├── ...
│       └── _fullsize/
│           └── YYYYMMDD_HHMMSS_location.jpg
└── Gallery 3/
    ├── YYYYMMDD_HHMMSS_location_vignette.jpg
    ├── ...
    └── _fullsize/
        └── ...
```

## Markdown content

All these informations are then gathered inside `src/content/` into markdown files:
There is one markdown file per asset folder (aka gallery).

Each markdown file contains data about the gallery and its list of media files:

```markdown
---
path: "assets/Norway/Henningsvaer",
medias: [
    {
        fileName: "2023-01-15_14:30:00_Henningsvaer_(Norway).jpg",
        isoDateTime: "2023-01-15T14:30:00",
        camera: "Canon EOS R5",
        lens: "RF 24-70mm f/2.8L IS USM",
        iso: 100,
        shutterSpeed: "1/250",
        aperture: "f/8.0",
        focalLength: "50mm",
        gpsCoords: [48.8567,2.3510],
        location: "Henningsvaer (Norway)"
    },
    { ... },
    { ... },
    ...
]
---

Gallery 1 (230 images)
```

## Galery navigation

Each galery will be rendered as a static HTML page. All will share the same template.
A header contains a breadcrumb component to display the current gallery path.

The main content is displayed into two sections : 

A folder sections will display clickable folder icons that will navigate to sub galeries.

A vignette section displays all the vignettes of the images in the gallery.

When we click a vignette, the fuill-size version is rendered in fullscreen in an interactive slideshow. Arrow kets allow to navigate to the next and previous image. Esc will close the slideshow view.

## Final build process (static site generation)

### Astro Data Loaders
The static site generation will use Astro's content collections to load gallery data from the markdown files in `src/content/`. Each gallery's markdown file will be processed by Astro's data loading system to generate the static pages.

### Page Layout
Each gallery page will use a common Astro layout component that includes:
- A header with breadcrumb navigation showing the current gallery path
- A main content area with two sections:
  1. Folder sections displaying clickable folder icons for sub-galleries
  2. Vignette sections displaying all image thumbnails in a grid layout

### Components
- `GalleryView.tsx`: Main React component for displaying the gallery content
- `Vignette.tsx`: React component for rendering individual image thumbnails

## Interactive Slideshow Implementation

### SimpleLightbox Integration
For the fullscreen slideshow functionality, we'll integrate SimpleLightbox jQuery plugin:

1. **Installation**: Add SimpleLightbox via npm/bun
2. **Initialization**: Initialize SimpleLightbox on all vignette elements with a specific class
3. **Configuration**: Configure SimpleLightbox to:
   - Display images in fullscreen overlay
   - Enable arrow key navigation between images
   - Close slideshow with ESC key
   - Support touch swipe gestures for mobile navigation
   - Show navigation arrows and image counter

### HTML Structure
The existing vignette HTML structure will be enhanced with SimpleLightbox-required attributes:
- Each vignette link will have a `href` pointing to the full-size image
- Links will have a common class (e.g., `slideshow-trigger`) for SimpleLightbox binding
- Gallery grouping will be handled via `data-gallery` attributes

### Dynamic Behavior
- When a vignette is clicked, SimpleLightbox will:
  1. Load the corresponding full-size image
  2. Display it in a centered fullscreen overlay
  3. Show navigation controls for moving between gallery images
  4. Handle keyboard (arrow keys/ESC) and touch interactions
  5. Close the overlay when ESC is pressed or close button is clicked

