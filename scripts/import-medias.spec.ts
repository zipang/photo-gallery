import { describe, it, expect, beforeEach } from "bun:test";
import { findLocation, geocodeCache, roundCoordinates } from "./import-medias";

// Helper function to add a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("findLocation() (Integration)", () => {

	beforeEach(async () => {
		// Clear cache and wait for 1.1 seconds to respect API rate limits (1 req/sec)
		geocodeCache.clear();
		await sleep(1100);
	});

	it("should return a valid location for valid coordinates (Eiffel Tower)", async () => {
		const lat = 48.8584;
		const lon = 2.2945;
		const location = await findLocation(lat, lon);

		// The exact name can sometimes change, so we check if it contains the expected city
		expect(location).toContain("Paris");
	});

	it("should return a valid location for valid coordinates (Statue of Liberty)", async () => {
		const lat = 40.6892;
		const lon = -74.0445;
		const location = await findLocation(lat, lon);

		expect(location).toContain("New York");
	});

	it("should use the cache on the second call for the same coordinates", async () => {
		const lat = 43.4832;
		const lon = -1.5586;

		// First call - should make a real API request
		const location1 = await findLocation(lat, lon);
		expect(location1).toContain("Biarritz");

		// Verify the result was cached
		const cacheKey = roundCoordinates(lat, lon);
		expect(geocodeCache.has(cacheKey)).toBe(true);

		// Second call - should be cached
		const location2 = await findLocation(lat, lon);
		expect(location2).toBe(location1);
	});

	it("should return null for coordinates in the middle of the ocean", async () => {
		// Point Nemo - the most remote place on Earth
		const lat = -48.876667;
		const lon = -123.393333;
		const location = await findLocation(lat, lon);

		expect(location).toBeNull();
	});

	it("should cache very close points under the same key and return the same result", async () => {
		// Two very close coordinates (within ~100 meters)
		const lat1 = 48.8584;
		const lon1 = 2.2945;
		const lat2 = 48.858401; // Slightly different
		const lon2 = 2.294501;  // Slightly different

		// Verify they round to the same cache key
		const cacheKey1 = roundCoordinates(lat1, lon1);
		const cacheKey2 = roundCoordinates(lat2, lon2);
		expect(cacheKey1).toBe(cacheKey2);

		// First call - should make a real API request
		const location1 = await findLocation(lat1, lon1);

		// Verify the result was cached
		expect(geocodeCache.has(cacheKey1)).toBe(true);

		// Second call with slightly different coordinates - should use cache
		const location2 = await findLocation(lat2, lon2);

		// Both should return the same result
		expect(location1).toBe(location2);
	});
});
