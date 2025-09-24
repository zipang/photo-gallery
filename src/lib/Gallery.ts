import { Media } from "./Media";
import type { GalleryInfo } from "./types";

export class Gallery {

	public name: string;
	public path: string;
	public medias: Media[];

	constructor({ name, path, medias }: GalleryInfo) {
		this.name = name;
		this.path = path;
		this.medias = medias.map((m => new Media(this, m)))
	}

	public get encodedPath(): string {
		return encodeURI(this.path)
	}
}