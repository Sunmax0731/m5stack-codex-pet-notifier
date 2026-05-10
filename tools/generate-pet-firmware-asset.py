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
DEFAULT_SCALE_MAX_HEIGHT = 200
ANIMATION_ROWS = [
    ("idle", 6),
    ("running-right", 8),
    ("running-left", 8),
    ("waving", 4),
    ("jumping", 5),
    ("failed", 8),
    ("waiting", 6),
    ("running", 6),
    ("review", 6),
]
SCALE_KEY_COLUMNS = {
    "idle": None,
    "running-right": 2,
    "running-left": 2,
    "waving": 2,
    "jumping": 2,
    "failed": 3,
    "waiting": 0,
    "running": 2,
    "review": 2,
}


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
    rows: list[tuple[int, int]],
) -> tuple[int, int, int, int]:
    cell_width = spritesheet.width // 8
    cell_height = spritesheet.height // 9
    bounds: tuple[int, int, int, int] | None = None
    for row, frames in rows:
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


def selected_rows(args: argparse.Namespace, spritesheet: Image.Image) -> list[tuple[int, str, int]]:
    if not args.all_rows:
        frame_count = args.frames if args.frames > 0 else detect_frame_count(spritesheet, args.row)
        return [(args.row, f"row-{args.row}", frame_count)]
    rows: list[tuple[int, str, int]] = []
    for row_index, (name, expected_frames) in enumerate(ANIMATION_ROWS):
        detected = detect_frame_count(spritesheet, row_index)
        rows.append((row_index, name, min(expected_frames, max(1, detected))))
    return rows


def scale_frame_columns(name: str, frame_count: int) -> list[int]:
    key_column = SCALE_KEY_COLUMNS.get(name, 0)
    if key_column is None:
        return list(range(frame_count))
    return [min(max(0, key_column), frame_count - 1)]


def write_header(args: argparse.Namespace) -> None:
    pet_dir = Path(args.pet_dir).resolve()
    metadata, spritesheet = load_pet(pet_dir)
    rows = selected_rows(args, spritesheet)
    bbox = union_content_bbox(spritesheet, [(row, frame_count) for row, _, frame_count in rows])
    row_offsets: list[int] = []
    row_frame_counts: list[int] = []
    frames: list[list[int]] = []
    for row, _, frame_count in rows:
        row_offsets.append(len(frames))
        row_frame_counts.append(frame_count)
        for column in range(frame_count):
            frames.append(frame_pixels(spritesheet, row, column, args.width, args.height))
    frame_count = row_frame_counts[0]
    scaled_dimensions = scale_dimensions(
        bbox,
        args.scale_levels,
        args.height,
        args.scale_max_height,
        args.scale_max_width,
    ) if args.scaled else []
    scale_frame_counts = [
        len(scale_frame_columns(name, frame_count))
        for _, name, frame_count in rows
    ]
    scale_frame_max = max(scale_frame_counts) if scale_frame_counts else 1
    scaled_offsets: list[list[list[int]]] = []
    scaled_pixels: list[int] = []
    if args.scaled:
        for width, height in scaled_dimensions:
            level_offsets: list[list[int]] = []
            for row, name, frame_count_for_row in rows:
                row_scale_offsets: list[int] = []
                for column in scale_frame_columns(name, frame_count_for_row):
                    row_scale_offsets.append(len(scaled_pixels))
                    scaled_pixels.extend(frame_pixels(
                        spritesheet,
                        row,
                        column,
                        width,
                        height,
                        bbox=bbox,
                        resampling=Image.Resampling.LANCZOS,
                    ))
                while len(row_scale_offsets) < scale_frame_max:
                    row_scale_offsets.append(row_scale_offsets[0] if row_scale_offsets else 0)
                level_offsets.append(row_scale_offsets)
            scaled_offsets.append(level_offsets)
    display_name = metadata.get("displayName", metadata.get("id", pet_dir.name))
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    frame_blocks = ",\n".join("{\n" + format_frame(frame) + "\n  }" for frame in frames)
    row_counts = ", ".join(str(value) for value in row_frame_counts)
    row_offset_values = ", ".join(str(value) for value in row_offsets)
    row_name_comment = ", ".join(name for _, name, _ in rows)
    lines = [
            "#pragma once",
            "",
            "// Generated from a local hatch-pet package. Do not commit this file.",
            f"// Animation rows: {row_name_comment}",
            f'static constexpr const char* PET_ASSET_NAME = "{c_string(display_name)}";',
            f"static constexpr uint16_t PET_ASSET_TRANSPARENT = 0x{TRANSPARENT_RGB565:04X};",
            f"static constexpr int PET_ASSET_FRAME_WIDTH = {args.width};",
            f"static constexpr int PET_ASSET_FRAME_HEIGHT = {args.height};",
            f"static constexpr int PET_ASSET_FRAME_COUNT = {frame_count};",
            f"static constexpr int PET_ASSET_ROW_COUNT = {len(rows)};",
            f"static constexpr int PET_ASSET_TOTAL_FRAME_COUNT = {len(frames)};",
            "#define PET_ASSET_HAS_ANIMATION_ROWS 1",
            f"static constexpr uint8_t PET_ASSET_ROW_FRAME_COUNTS[PET_ASSET_ROW_COUNT] PROGMEM = {{ {row_counts} }};",
            f"static constexpr uint16_t PET_ASSET_ROW_OFFSETS[PET_ASSET_ROW_COUNT] PROGMEM = {{ {row_offset_values} }};",
            f"static const uint16_t PET_ASSET_FRAMES[PET_ASSET_TOTAL_FRAME_COUNT][PET_ASSET_FRAME_WIDTH * PET_ASSET_FRAME_HEIGHT] PROGMEM = {{",
            "  " + frame_blocks,
            "};",
            "",
    ]
    if args.scaled:
        widths = ", ".join(str(width) for width, _ in scaled_dimensions)
        heights = ", ".join(str(height) for _, height in scaled_dimensions)
        scale_counts = ", ".join(str(value) for value in scale_frame_counts)
        offset_rows = ",\n".join(
            "  {\n" + ",\n".join(
                "    {" + ", ".join(str(offset) for offset in row_offsets_for_level) + "}"
                for row_offsets_for_level in offsets
            ) + "\n  }"
            for offsets in scaled_offsets
        )
        lines.extend([
            "// Scale-specific frames are generated from the source pet cells, not from the low-resolution base frame.",
            "// Idle keeps its full high-resolution animation. Other rows keep one high-resolution character pose to preserve flash.",
            "#define PET_ASSET_HAS_SCALE_FRAMES 1",
            f"static constexpr int PET_ASSET_SCALE_LEVELS = {args.scale_levels};",
            f"static constexpr int PET_ASSET_SCALE_FRAME_MAX = {scale_frame_max};",
            f"static constexpr uint8_t PET_ASSET_SCALE_FRAME_COUNTS[PET_ASSET_ROW_COUNT] PROGMEM = {{ {scale_counts} }};",
            f"static constexpr uint16_t PET_ASSET_SCALE_WIDTHS[PET_ASSET_SCALE_LEVELS] PROGMEM = {{ {widths} }};",
            f"static constexpr uint16_t PET_ASSET_SCALE_HEIGHTS[PET_ASSET_SCALE_LEVELS] PROGMEM = {{ {heights} }};",
            f"static constexpr uint32_t PET_ASSET_SCALE_OFFSETS[PET_ASSET_SCALE_LEVELS][PET_ASSET_ROW_COUNT][PET_ASSET_SCALE_FRAME_MAX] PROGMEM = {{",
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
    row_message = f"{len(rows)} rows / {len(frames)} frames" if args.all_rows else f"{frame_count} frames"
    print(f"generated {output} from {pet_dir.name} ({row_message}{scaled_message})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pet-dir", required=True, help="Path to a hatch-pet package directory.")
    parser.add_argument("--output", default="firmware/include/pet_asset.local.h")
    parser.add_argument("--row", type=int, default=0, help="Spritesheet row to use. Row 0 is idle.")
    parser.add_argument("--frames", type=int, default=0, help="Number of frames to extract. 0 auto-detects non-empty cells in the selected row.")
    parser.add_argument("--all-rows", action=argparse.BooleanOptionalAction, default=True, help="Extract the standard 9-row hatch-pet atlas.")
    parser.add_argument("--width", type=int, default=36)
    parser.add_argument("--height", type=int, default=40)
    parser.add_argument("--scaled", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--scale-levels", type=int, default=8)
    parser.add_argument("--scale-max-height", type=int, default=DEFAULT_SCALE_MAX_HEIGHT)
    parser.add_argument("--scale-max-width", type=int, default=300)
    return parser.parse_args()


if __name__ == "__main__":
    write_header(parse_args())
