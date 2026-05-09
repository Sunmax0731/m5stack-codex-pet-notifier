#!/usr/bin/env python
"""Generate an ignored M5Stack firmware pet asset header from a hatch-pet package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - environment guidance
    raise SystemExit("Pillow is required: python -m pip install Pillow") from exc


TRANSPARENT_RGB565 = 0xF81F
DEFAULT_SCALE_MAX_HEIGHT = 220


def rgb565(red: int, green: int, blue: int) -> int:
    value = ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3)
    return 0xF81E if value == TRANSPARENT_RGB565 else value


def load_pet(pet_dir: Path) -> tuple[dict, Image.Image]:
    pet_json = pet_dir / "pet.json"
    if not pet_json.exists():
        raise SystemExit(f"pet.json not found: {pet_json}")
    metadata = json.loads(pet_json.read_text(encoding="utf-8"))
    spritesheet_path = pet_dir / metadata.get("spritesheetPath", "spritesheet.webp")
    if not spritesheet_path.exists():
        raise SystemExit(f"spritesheet not found: {spritesheet_path}")
    return metadata, Image.open(spritesheet_path).convert("RGBA")


def c_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def union_content_bbox(
    spritesheet: Image.Image,
    row: int,
    frames: int,
) -> tuple[int, int, int, int]:
    cell_width = spritesheet.width // 8
    cell_height = spritesheet.height // 9
    bounds: tuple[int, int, int, int] | None = None
    for column in range(frames):
        cell = spritesheet.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        bbox = cell.getbbox()
        if bbox is None:
            continue
        bounds = bbox if bounds is None else (
            min(bounds[0], bbox[0]),
            min(bounds[1], bbox[1]),
            max(bounds[2], bbox[2]),
            max(bounds[3], bbox[3]),
        )
    if bounds is None:
        return (0, 0, cell_width, cell_height)
    margin = 2
    return (
        max(0, bounds[0] - margin),
        max(0, bounds[1] - margin),
        min(cell_width, bounds[2] + margin),
        min(cell_height, bounds[3] + margin),
    )


def detect_frame_count(spritesheet: Image.Image, row: int, max_frames: int = 8) -> int:
    cell_width = spritesheet.width // 8
    cell_height = spritesheet.height // 9
    last_non_empty = -1
    for column in range(max_frames):
        cell = spritesheet.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        if cell.getbbox() is not None:
            last_non_empty = column
    return max(1, last_non_empty + 1)


def frame_pixels(
    spritesheet: Image.Image,
    row: int,
    column: int,
    frame_width: int,
    frame_height: int,
    bbox: tuple[int, int, int, int] | None = None,
    resampling: Image.Resampling = Image.Resampling.NEAREST,
) -> list[int]:
    cell_width = spritesheet.width // 8
    cell_height = spritesheet.height // 9
    cell = spritesheet.crop((
        column * cell_width,
        row * cell_height,
        (column + 1) * cell_width,
        (row + 1) * cell_height,
    ))
    if bbox is not None:
        cell = cell.crop(bbox)
    resized = cell.resize((frame_width, frame_height), resampling)
    pixels: list[int] = []
    for red, green, blue, alpha in resized.getdata():
        if alpha < 64:
            pixels.append(TRANSPARENT_RGB565)
        else:
            pixels.append(rgb565(red, green, blue))
    return pixels


def scale_dimensions(
    bbox: tuple[int, int, int, int],
    levels: int,
    base_height: int,
    max_height: int,
    max_width: int,
) -> list[tuple[int, int]]:
    source_width = max(1, bbox[2] - bbox[0])
    source_height = max(1, bbox[3] - bbox[1])
    aspect = source_width / source_height
    output: list[tuple[int, int]] = []
    for level in range(levels):
        height = base_height + round((max_height - base_height) * level / max(1, levels - 1))
        width = min(max_width, max(1, round(height * aspect)))
        output.append((width, height))
    return output


def format_frame(values: list[int]) -> str:
    lines = []
    for index in range(0, len(values), 12):
        line = ", ".join(f"0x{value:04X}" for value in values[index:index + 12])
        lines.append(f"    {line}")
    return ",\n".join(lines)


def format_flat_pixels(values: list[int]) -> str:
    return format_frame(values)


def write_header(args: argparse.Namespace) -> None:
    pet_dir = Path(args.pet_dir).resolve()
    metadata, spritesheet = load_pet(pet_dir)
    frame_count = args.frames if args.frames > 0 else detect_frame_count(spritesheet, args.row)
    bbox = union_content_bbox(spritesheet, args.row, frame_count)
    frames = [
        frame_pixels(spritesheet, args.row, column, args.width, args.height)
        for column in range(frame_count)
    ]
    scaled_dimensions = scale_dimensions(
        bbox,
        args.scale_levels,
        args.height,
        args.scale_max_height,
        args.scale_max_width,
    ) if args.scaled else []
    scaled_offsets: list[list[int]] = []
    scaled_pixels: list[int] = []
    if args.scaled:
        for width, height in scaled_dimensions:
            level_offsets: list[int] = []
            for column in range(frame_count):
                level_offsets.append(len(scaled_pixels))
                scaled_pixels.extend(frame_pixels(
                    spritesheet,
                    args.row,
                    column,
                    width,
                    height,
                    bbox=bbox,
                    resampling=Image.Resampling.LANCZOS,
                ))
            scaled_offsets.append(level_offsets)
    display_name = metadata.get("displayName", metadata.get("id", pet_dir.name))
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    frame_blocks = ",\n".join("{\n" + format_frame(frame) + "\n  }" for frame in frames)
    lines = [
            "#pragma once",
            "",
            "// Generated from a local hatch-pet package. Do not commit this file.",
            f'static constexpr const char* PET_ASSET_NAME = "{c_string(display_name)}";',
            f"static constexpr uint16_t PET_ASSET_TRANSPARENT = 0x{TRANSPARENT_RGB565:04X};",
            f"static constexpr int PET_ASSET_FRAME_WIDTH = {args.width};",
            f"static constexpr int PET_ASSET_FRAME_HEIGHT = {args.height};",
            f"static constexpr int PET_ASSET_FRAME_COUNT = {frame_count};",
            f"static const uint16_t PET_ASSET_FRAMES[PET_ASSET_FRAME_COUNT][PET_ASSET_FRAME_WIDTH * PET_ASSET_FRAME_HEIGHT] PROGMEM = {{",
            "  " + frame_blocks,
            "};",
            "",
    ]
    if args.scaled:
        widths = ", ".join(str(width) for width, _ in scaled_dimensions)
        heights = ", ".join(str(height) for _, height in scaled_dimensions)
        offset_rows = ",\n".join(
            "  {" + ", ".join(str(offset) for offset in offsets) + "}"
            for offsets in scaled_offsets
        )
        lines.extend([
            "// Scale-specific frames are generated from the source pet cells, not from the low-resolution base frame.",
            "// Firmware uses these on Core2 to avoid blocky nearest-neighbor enlargement.",
            "#define PET_ASSET_HAS_SCALE_FRAMES 1",
            f"static constexpr int PET_ASSET_SCALE_LEVELS = {args.scale_levels};",
            f"static constexpr uint16_t PET_ASSET_SCALE_WIDTHS[PET_ASSET_SCALE_LEVELS] PROGMEM = {{ {widths} }};",
            f"static constexpr uint16_t PET_ASSET_SCALE_HEIGHTS[PET_ASSET_SCALE_LEVELS] PROGMEM = {{ {heights} }};",
            f"static constexpr uint32_t PET_ASSET_SCALE_OFFSETS[PET_ASSET_SCALE_LEVELS][PET_ASSET_FRAME_COUNT] PROGMEM = {{",
            offset_rows,
            "};",
            f"static const uint16_t PET_ASSET_SCALED_PIXELS[{len(scaled_pixels)}] PROGMEM = {{",
            format_flat_pixels(scaled_pixels),
            "};",
            "",
        ])
    output.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )
    scaled_message = f", {args.scale_levels} scale-specific frame sets" if args.scaled else ""
    print(f"generated {output} from {pet_dir.name} ({frame_count} frames{scaled_message})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pet-dir", required=True, help="Path to a hatch-pet package directory.")
    parser.add_argument("--output", default="firmware/include/pet_asset.local.h")
    parser.add_argument("--row", type=int, default=0, help="Spritesheet row to use. Row 0 is idle.")
    parser.add_argument("--frames", type=int, default=0, help="Number of frames to extract. 0 auto-detects non-empty cells in the selected row.")
    parser.add_argument("--width", type=int, default=36)
    parser.add_argument("--height", type=int, default=40)
    parser.add_argument("--scaled", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--scale-levels", type=int, default=8)
    parser.add_argument("--scale-max-height", type=int, default=DEFAULT_SCALE_MAX_HEIGHT)
    parser.add_argument("--scale-max-width", type=int, default=300)
    return parser.parse_args()


if __name__ == "__main__":
    write_header(parse_args())
