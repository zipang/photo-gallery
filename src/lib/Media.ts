import { Gallery } from './Gallery';
import type { MediaMetadata } from './types';

export class Media {
	private gallery: Gallery;
	private metadata: MediaMetadata;

	constructor(gallery: Gallery, metadata: MediaMetadata) {
		this.gallery = gallery;
		this.metadata = metadata;
	}

	get vignetteUrl(): string {
		// Extract the base name without extension
		const baseName = this.metadata.fileName.replace(/\.(jpg|jpeg|png|webp)$/i, "");
		const vignetteFileName = `${baseName}_vignette.jpg`;
		return `${this.gallery.path}/${vignetteFileName}`;
	}

	get fullSizeUrl(): string {
		// Extract the base name without extension
		const baseName = this.metadata.fileName.replace(/\.(jpg|jpeg|png|webp)$/i, "");
		const fullSizeFileName = `${baseName}.jpg`;
		return `${this.gallery.path}/_fullsize/${fullSizeFileName}`;
	}

	get displayName(): string {
		const date = new Date(this.metadata.isoDateTime);
		const formattedDate = date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		return `${this.metadata.location} - (${formattedDate})`;
	}

	get metadataInfo(): MediaMetadata {
		return this.metadata;
	}

	get fileName(): string {
		return this.metadata.fileName;
	}

	get isoDateTime(): string {
		return this.metadata.isoDateTime;
	}

	get location(): string {
		return this.metadata.location;
	}
}