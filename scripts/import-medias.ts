#!/usr/bin/env bun

import { readdir, stat, mkdir, copyFile, rm } from "fs/promises";
import { extname, join, basename, relative } from "path";
import sharp from "sharp";
import exifr from "exifr";
import { fetch } from "bun";
import pLimit from "p-limit";
import pThrottle from "p-throttle";
import os from "os";
import { SingleBar, Presets } from "cli-progress";

// Simple ANSI color functions
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",

	paint: function (color: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan', text: string) {
		return this[color] + text + this.reset;
	}
};

// Constants
const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm', '.mov'];
const VIGNETTE_WIDTH = process.env.VIGNETTE_WIDTH ? parseInt(process.env.VIGNETTE_WIDTH) : 640;
const JPEG_QUALITY = process.env.JPEG_QUALITY ? parseInt(process.env.JPEG_QUALITY) : 75;
const CONCURRENCY = os.cpus().length;

// File locations @see https://bun.com/guides/util/import-meta-dir
const scriptFolder = import.meta.dir;
const rootFolder = join(scriptFolder, "..");
const assetsFolder = join(rootFolder, "assets");
const contentFolder = join(rootFolder, "src/content/galleries");

// Concurrency limiter for CPU-bound tasks
const parallel = pLimit(CONCURRENCY);

// Throttle for API calls to respect rate limits (1 request per 1.1 seconds)
const geocodeThrottle = pThrottle({ limit: 1, interval: 1100 });
const throttledFetch = geocodeThrottle(fetch);

// --- Persistent Geocode Cache ---
const CACHE_FILE_PATH = join(import.meta.dir, 'cached-locations.json');

export const geocodeCache = {
	_cache: new Map<string, string>(),

	get(key: string): string | undefined {
		return this._cache.get(key);
	},

	set(key: string, value: string): void {
		this._cache.set(key, value);
	},

	has(key: string): boolean {
		return this._cache.has(key);
	},

	clear(): void {
		this._cache.clear();
	},

	async load(): Promise<void> {
		try {
			const file = Bun.file(CACHE_FILE_PATH);
			const data = await file.json();
			if (Array.isArray(data)) {
				this._cache = new Map(data);
				console.log(colors.paint('cyan', `Loaded ${this._cache.size} locations from cache.`));
			}
		} catch (error) {
			console.log(colors.paint('yellow', "No existing location cache found. A new one will be created."));
			this._cache = new Map<string, string>();
		}
	},

	async save(): Promise<void> {
		const data = Array.from(this._cache.entries());
		await Bun.write(CACHE_FILE_PATH, JSON.stringify(data, null, 2));
		console.log(colors.paint('cyan', `Saved ${this._cache.size} locations to cache.`));
	}
};
// --- End of Cache ---

interface MediaMetadata {
	fileName: string;
	originalPath: string;
	isoDateTime: string;
	camera: string;
	lens: string;
	iso: number;
	shutterSpeed: string;
	aperture: string;
	focalLength: string;
	gpsCoords: [number, number] | null;
	location: string;
}

interface GalleryInfo {
	name: string;
	path: string;
	medias: MediaMetadata[];
}

/**
 * Main import function
 */
async function importMedia() {
	const start = Date.now();
	console.log(colors.paint('blue', `Starting media import process with ${CONCURRENCY} parallel tasks...`));

	const mediaDir = process.argv[2] || process.env.MEDIA_DIR;
	if (!mediaDir) {
		console.error(colors.paint('red', "Please provide media directory path as argument or set MEDIA_DIR environment variable"));
		process.exit(1);
	}

	try {
		await geocodeCache.load();

		const mediaStat = await stat(mediaDir);
		if (!mediaStat.isDirectory()) {
			throw new Error(`Media path ${mediaDir} is not a directory`);
		}

		console.log(colors.paint('yellow', "Cleaning assets and content directories..."));
		await Promise.all([
			rm(assetsFolder, { recursive: true, force: true }),
			rm(contentFolder, { recursive: true, force: true })
		]);

		await Promise.all([
			mkdir(assetsFolder, { recursive: true }),
			mkdir(contentFolder, { recursive: true })
		]);

		console.log(colors.paint('blue', "Scanning directories and extracting metadata..."));
		const galleries = await scanDirectory(mediaDir);

		const allMediaTasks = galleries.flatMap(gallery => {
			const galleryAssetsDir = join(assetsFolder, relative(mediaDir, gallery.path));
			return gallery.medias.map(media => ({ media, galleryAssetsDir }));
		});

		console.log(colors.paint('blue', `Importing ${allMediaTasks.length} files to gallery assets...`));

		// Initialize progress bar
		const progressBar = new SingleBar({
			format: 'Progress: [{bar}] {percentage}% | {value}/{total} media files processed',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			hideCursor: true
		}, Presets.shades_classic);
		progressBar.start(allMediaTasks.length, 0);

		const processingPromises = allMediaTasks.map(({ media, galleryAssetsDir }) =>
			parallel(async () => {
				await processMediaFile(media, galleryAssetsDir);
				progressBar.increment();
			})
		);
		await Promise.all(processingPromises);
		progressBar.stop();

		console.log(colors.paint('blue', "Generating markdown files..."));
		for (const gallery of galleries) {
			const galleryContentDir = join(contentFolder, relative(mediaDir, gallery.path));
			await generateMarkdown(gallery, galleryContentDir);
		}

		const elapsed = Date.now() - start;
		console.log(colors.paint('green', "Media import + content generation complete!"));

		// Display the generated assets directory tree
		await buildReport();
		console.log(colors.paint('green', `${allMediaTasks.length} media files imported in ${elapsed}ms...`))
	} catch (error) {
		console.error(colors.paint('red', "Error during media import:"), error);
		process.exit(1);
	} finally {
		await geocodeCache.save();
	}
}

/**
 * Recursively scan directory structure and build gallery information
 */
async function scanDirectory(dirPath: string, basePath: string = dirPath): Promise<GalleryInfo[]> {

	const galleries: GalleryInfo[] = [];
	const galery: GalleryInfo = {
		name: basename(dirPath),
		path: dirPath,
		medias: []
	}

	const entries = await readdir(dirPath, { withFileTypes: true });
	const directories = entries.filter(entry => entry.isDirectory());
	const files = entries.filter(entry => entry.isFile());

	const fileProcessingPromises = files
		.filter(fileEntry => {
			const fileExt = extname(fileEntry.name).toLowerCase();
			return SUPPORTED_IMAGE_FORMATS.includes(fileExt) || SUPPORTED_VIDEO_FORMATS.includes(fileExt);
		})
		.map(fileEntry => {
			const filePath = join(dirPath, fileEntry.name);
			return parallel(() => extractMetadata(filePath, galery.name));
		});

	const medias = await Promise.all(fileProcessingPromises);

	if (medias.length > 0) {
		galleries.push({
			...galery,
			medias
		});
	}

	const subGalleryPromises = directories.map(dir => scanDirectory(join(dirPath, dir.name), basePath));
	const subGalleries = await Promise.all(subGalleryPromises);
	galleries.push(...subGalleries.flat());

	return galleries;
}

/**
 * Build a tree output of a directory content (similar to the tree command)
 * @param dirPath 
 * @param prefix 
 */
async function buildTree(dirPath: string, prefix = ""): Promise<string> {
	const entries = await readdir(dirPath, { withFileTypes: true });
	const directories = entries.filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
	const files = entries.filter(entry => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name));

	let result = "";
	const allItems = [...directories, ...files];

	for (let i = 0; i < allItems.length; i++) {
		const item = allItems[i];
		const isLast = i === allItems.length - 1;
		const currentPrefix = isLast ? "└── " : "├── ";
		const nextPrefix = isLast ? "    " : "│   ";

		result += `${prefix}${currentPrefix}${item.name}\n`;

		if (item.isDirectory()) {
			const subDirPath = join(dirPath, item.name);
			const subTree = await buildTree(subDirPath, prefix + nextPrefix);
			if (subTree) {
				result += subTree;
			}
		}
	}

	return result;
}


/**
 * Extract metadata from media file (EXIF data for images)
 */
async function extractMetadata(filePath: string, defaultLocation = "Unknown Location"): Promise<MediaMetadata> {
	const fileName = basename(filePath);
	const fileExt = extname(filePath).toLowerCase();

	if (!SUPPORTED_IMAGE_FORMATS.includes(fileExt)) {
		return {
			fileName, originalPath: filePath, isoDateTime: new Date().toISOString(), camera: "N/A", lens: "N/A",
			iso: 0, shutterSpeed: "N/A", aperture: "N/A", focalLength: "N/A", gpsCoords: null, location: defaultLocation
		};
	}

	try {
		const exifData = await exifr.parse(filePath, { gps: true, makernote: true });

		let isoDateTime = new Date().toISOString();
		if (exifData?.DateTimeOriginal) isoDateTime = new Date(exifData.DateTimeOriginal).toISOString();
		else if (exifData?.DateTime) isoDateTime = new Date(exifData.DateTime).toISOString();

		let gpsCoords: [number, number] | null = null;
		let location = defaultLocation;
		if (exifData?.latitude && exifData?.longitude) {
			gpsCoords = [exifData.latitude, exifData.longitude];
			location = (await findLocation(exifData.latitude, exifData.longitude)) ?? defaultLocation;
		}

		const camera = exifData?.Make && exifData?.Model ? `${exifData.Make} ${exifData.Model}` : "Unknown Camera";
		const lens = exifData?.LensModel || "Unknown Lens";
		const iso = exifData?.ISO || 0;
		const shutterSpeed = exifData?.ExposureTime ? `1/${Math.round(1 / exifData.ExposureTime)}` : "N/A";
		const aperture = exifData?.FNumber ? `f/${exifData.FNumber}` : "N/A";
		const focalLength = exifData?.FocalLength ? `${exifData.FocalLength}mm` : "N/A";

		return {
			fileName, originalPath: filePath, isoDateTime, camera, lens, iso, shutterSpeed,
			aperture, focalLength, gpsCoords, location
		};
	} catch (error) {
		console.warn(colors.paint('yellow', `Failed to extract EXIF data from ${filePath}:`), error);
		return {
			fileName, originalPath: filePath, isoDateTime: new Date().toISOString(), camera: "Unknown Camera", lens: "Unknown Lens",
			iso: 0, shutterSpeed: "N/A", aperture: "N/A", focalLength: "N/A", gpsCoords: null, location: "Unknown Location"
		};
	}
}

/**
 * Process media file: create vignette and full-size versions
 */
async function processMediaFile(metadata: MediaMetadata, galleryAssetsDir: string) {
	const fullSizeDir = join(galleryAssetsDir, "_fullsize");
	await mkdir(fullSizeDir, { recursive: true });

	const timestamp = metadata.isoDateTime.replace(/[:\-T]/g, '').slice(0, 14);
	const location = metadata.location.replace(/[^a-zA-Z0-9]/g, '_');
	const newBaseName = `${timestamp}_${location}`;

	const fileExt = extname(metadata.fileName).toLowerCase();
	const vignetteFileName = `${newBaseName}_vignette${fileExt}`;
	const fullSizeFileName = `${newBaseName}${fileExt}`;

	const vignettePath = join(galleryAssetsDir, vignetteFileName);
	const fullSizePath = join(fullSizeDir, fullSizeFileName);

	const isImage = SUPPORTED_IMAGE_FORMATS.includes(fileExt);

	if (isImage) {
		try {
			// Create a pipeline that preserves metadata and auto-orients based on EXIF
			const basePipeline = sharp(metadata.originalPath)
				.withMetadata() // Preserve all metadata (EXIF, XMP, IPTC)
				.rotate(); // Auto-rotate based on EXIF orientation tag

			await Promise.all([
				// Create vignette with Sharp
				basePipeline.clone()
					.resize({ width: VIGNETTE_WIDTH })
					.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
					.toFile(vignettePath),

				// Create full-size version with Sharp (with mozjpeg optimization)
				basePipeline.clone()
					.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
					.toFile(fullSizePath)
			]);
		} catch (error) {
			console.error(colors.paint('red', `Error processing image ${metadata.originalPath}:`), error);
			await copyFile(metadata.originalPath, fullSizePath);
		}
	} else {
		await copyFile(metadata.originalPath, fullSizePath);
	}

	metadata.fileName = fullSizeFileName;
}

/**
 * Round GPS coordinates to approximately 100-meter resolution
 */
export function roundCoordinates(lat: number, lon: number): string {
	const precision = 3; // Approx 100m
	return `${lat.toFixed(precision)},${lon.toFixed(precision)}`;
}

/**
 * Reverse geocode GPS coordinates to get location name
 */
export async function findLocation(lat: number, lon: number): Promise<string | null> {
	const cacheKey = roundCoordinates(lat, lon);
	if (geocodeCache.has(cacheKey)) {
		return geocodeCache.get(cacheKey)!;
	}

	try {
		const response = await throttledFetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

		const data = await response.json();
		let locationName: string | null = null;
		if (data.address) {
			const { city, town, village, hamlet, county, state, country } = data.address;
			locationName = city || town || village || hamlet || county || state || country || data.display_name || null;
		} else if (data.display_name) {
			locationName = data.display_name;
		}

		if (locationName) {
			geocodeCache.set(cacheKey, locationName);
		}
		return locationName;
	} catch (error) {
		console.warn(colors.paint('yellow', `Failed to reverse geocode coordinates [${lat}, ${lon}]:`), error);
		return null;
	}
}

/**
 * Generate markdown file with gallery metadata
 */
async function generateMarkdown(gallery: GalleryInfo, outputDir: string) {
	const mdFilePath = join(outputDir, "index.md");
	await mkdir(outputDir, { recursive: true });

	const mdContent = `---
name: ${JSON.stringify(gallery.name)}
path: ${JSON.stringify(gallery.path)}
medias: ${JSON.stringify(gallery.medias, null, 2)}
---

# ${gallery.name} (${gallery.medias.length} media files)
`;

	await Bun.write(mdFilePath, mdContent);
}

/**
 * Display a tree structure of the content directory
 */
async function buildReport() {
	console.log(colors.paint('blue', "\nGenerated markdown content:"));

	try {
		const tree = await buildTree(contentFolder);
		if (tree) {
			console.log("src/content/galleries/");
			console.log(tree);
		} else {
			console.log(colors.paint('yellow', "<Empty>"));
		}
	} catch (error) {
		console.log(colors.paint('yellow', "Could not display assets tree:"), error);
	}
}

if (import.meta.main) {
	importMedia();
}
