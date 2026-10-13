import ExifReader from "exifreader";
import type { MetadataDiscovery } from "./discovery-types";
const selected = [
  "Make",
  "Model",
  "DateTimeOriginal",
  "OffsetTimeOriginal",
  "ExposureTime",
  "FNumber",
  "ISOSpeedRatings",
  "PhotographicSensitivity",
  "FocalLength",
  "Orientation",
  "Software",
  "GPSLatitude",
  "GPSLongitude",
  "GPSLatitudeRef",
  "GPSLongitudeRef",
];
export async function inspectMetadata(
  buffer: ArrayBuffer,
): Promise<MetadataDiscovery> {
  try {
    const tags = await ExifReader.load(buffer, {
      expanded: true,
      includeTags: { exif: selected, gps: true, png: ["Software"] },
      async: true,
      decompress: { maxDecompressedSize: 2 * 1024 * 1024 },
    });
    const exif = (tags.exif ?? {}) as unknown as Record<string, unknown>;
    const rows: [string, string[]][] = [
      ["Camera manufacturer", ["Make"]],
      ["Camera model", ["Model"]],
      ["Capture time (as recorded)", ["DateTimeOriginal"]],
      ["Recorded timezone offset", ["OffsetTimeOriginal"]],
      ["Exposure time", ["ExposureTime"]],
      ["Aperture", ["FNumber"]],
      ["ISO", ["PhotographicSensitivity", "ISOSpeedRatings"]],
      ["Focal length", ["FocalLength"]],
      ["Orientation", ["Orientation"]],
      ["Software", ["Software"]],
    ];
    const fields = rows.flatMap(([label, keys]) => {
      const tag =
        keys.map((key) => exif[key]).find(Boolean) ??
        (label === "Software" ? tags.pngText?.Software : undefined);
      let description =
        tag && typeof tag === "object" && "description" in tag
          ? tag.description
          : undefined;
      if (
        label === "Orientation" &&
        tag &&
        typeof tag === "object" &&
        "value" in tag &&
        typeof tag.value === "number"
      ) {
        description =
          (
            {
              1: "Normal",
              2: "Mirrored horizontally",
              3: "Rotated 180°",
              4: "Mirrored vertically",
              5: "Transposed",
              6: "Rotated 90° clockwise",
              7: "Transverse",
              8: "Rotated 90° counterclockwise",
            } as Record<number, string>
          )[tag.value] ?? description;
      }
      if (description === undefined || description === "") return [];
      return [
        {
          label,
          value: String(description)
            .replace(/[\u0000-\u001f]/g, " ")
            .slice(0, 256),
        },
      ];
    });
    const latitude = tags.gps?.Latitude,
      longitude = tags.gps?.Longitude;
    const hasLocation = !!(
      exif.GPSLatitude ||
      exif.GPSLongitude ||
      latitude !== undefined ||
      longitude !== undefined
    );
    const location =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
        ? { latitude, longitude }
        : undefined;
    return {
      status: fields.length || hasLocation ? "available" : "missing",
      fields,
      hasLocation,
      ...(location ? { location } : {}),
    };
  } catch {
    // Never echo parser exceptions: they can contain private metadata.
    return { status: "error", fields: [], hasLocation: false };
  }
}
