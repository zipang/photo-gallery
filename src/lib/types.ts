export interface MediaMetadata {
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

export interface GalleryInfo {
	name: string;
	path: string;
	medias: MediaMetadata[];
}

export const validateMediaData: (data: any) => MediaMetadata = (data) => {

	// Check the presence and type of each field
	if (!data.fileName) {
		throw new TypeError("Missing 'fileName' in MediaMetadata");
	}

	return data as MediaMetadata;
}