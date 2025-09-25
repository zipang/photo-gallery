import { defineCollection } from 'astro:content';
import { z } from 'zod';
import type { MediaMetadata } from './src/lib/types';

const mediaMetadataSchema = z.object({
	fileName: z.string(),
	originalPath: z.string(),
	isoDateTime: z.string(),
	camera: z.string(),
	lens: z.string(),
	iso: z.number(),
	shutterSpeed: z.string(),
	aperture: z.string(),
	focalLength: z.string(),
	width: z.number(),
	height: z.number(),
	gpsCoords: z.union([z.tuple([z.number(), z.number()]), z.null()]),
	location: z.string(),
});

const gallerySchema = z.object({
	name: z.string(),
	path: z.string(),
	medias: z.array(mediaMetadataSchema),
});

const galleriesCollection = defineCollection({
	type: 'content',
	schema: gallerySchema,
});

export const collections = {
	galleries: galleriesCollection,
};