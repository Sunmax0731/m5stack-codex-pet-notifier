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


def frame_pixels(
    spritesheet: Image.Image,
    row: int,
    column: int,
    frame_width: int,
    frame_height: int,
) -> list[int]:
    cell_width = spritesheet.width // 8
    cell_height = spritesheet.height // 9
    cell = spritesheet.crop((
        column * cell_width,
        row * cell_height,
        (column + 1) * cell_width,
        (row + 1) * cell_height,
    ))
    resized = cell.resize((frame_width, frame_height), Image.Resampling.NEAREST)
    pixels: list[int] = []
    for red, green, blue, alpha in resized.getdata():
        if alpha < 64:
            pixels.append(TRANSPARENT_RGB565)
        else:
            pixels.append(rgb565(red, green, blue))
    return pixels


def format_frame(values: list[int]) -> str:
    lines = []
    for index in range(0, len(values), 12):
        line = ", ".join(f"0x{value:04X}" for value in values[index:index + 12])
        lines.append(f"    {line}")
    return ",\n".join(lines)


def write_header(args: argparse.Namespace) -> None:
    pet_dir = Path(args.pet_dir).resolve()
    metadata, spritesheet = load_pet(pet_dir)
    frames = [
        frame_pixels(spritesheet, args.row, column, args.width, args.height)
        for column in range(args.frames)
    ]
    display_name = metadata.get("displayName", metadata.get("id", pet_dir.name))
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    frame_blocks = ",\n".join("{\n" + format_frame(frame) + "\n  }" for frame in frames)
    output.write_text(
        "\n".join([
            "#pragma once",
            "",
            "// Generated from a local hatch-pet package. Do not commit this file.",
            f'static constexpr const char* PET_ASSET_NAME = "{display_name}";',
            f"static constexpr uint16_t PET_ASSET_TRANSPARENT = 0x{TRANSPARENT_RGB565:04X};",
            f"static constexpr int PET_ASSET_FRAME_WIDTH = {args.width};",
            f"static constexpr int PET_ASSET_FRAME_HEIGHT = {args.height};",
            f"static constexpr int PET_ASSET_FRAME_COUNT = {args.frames};",
            f"static const uint16_t PET_ASSET_FRAMES[PET_ASSET_FRAME_COUNT][PET_ASSET_FRAME_WIDTH * PET_ASSET_FRAME_HEIGHT] PROGMEM = {{",
            "  " + frame_blocks,
            "};",
            "",
        ]),
        encoding="utf-8",
    )
    print(f"generated {output} from {pet_dir.name} ({args.frames} frames)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pet-dir", required=True, help="Path to a hatch-pet package directory.")
    parser.add_argument("--output", default="firmware/include/pet_asset.local.h")
    parser.add_argument("--row", type=int, default=0, help="Spritesheet row to use. Row 0 is idle.")
    parser.add_argument("--frames", type=int, default=4)
    parser.add_argument("--width", type=int, default=36)
    parser.add_argument("--height", type=int, default=40)
    return parser.parse_args()


if __name__ == "__main__":
    write_header(parse_args())
