#!/usr/bin/env python3
"""Deterministically package the five Ancient Seas plant cutouts with Pillow."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "tools/art/ancientseas/plants"
OUTPUT = ROOT / "public/assets/ancientseas"


def knock_out_white(image: Image.Image) -> Image.Image:
    """Recover alpha from a white matte using the brand-intake thresholds."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = np.divide(maximum - minimum, maximum, out=np.zeros_like(maximum), where=maximum > 0)
    bright = np.clip((maximum - 205.0) / (248.0 - 205.0), 0.0, 1.0)
    colourless = np.clip((0.16 - saturation) / (0.16 - 0.04), 0.0, 1.0)
    alpha = np.clip(1.0 - bright * colourless, 0.0, 1.0)
    alpha[alpha <= 0.002] = 0.0

    safe_alpha = np.where(alpha > 0, alpha, 1.0)[..., None]
    unmixed = np.clip((rgb - 255.0 * (1.0 - alpha[..., None])) / safe_alpha, 0.0, 255.0)
    rgba = np.dstack((unmixed.astype(np.uint8), np.rint(alpha * 255.0).astype(np.uint8)))
    return Image.fromarray(rgba)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("source contains no visible pixels")
    return bbox


def fit_on_canvas(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.crop(alpha_bbox(image))
    padding = round(width * 0.015)
    inner = (width - 2 * padding, height - 2 * padding)
    image.thumbnail(inner, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((width - image.width) // 2, (height - image.height) // 2))
    return canvas


def save_under_budget(image: Image.Image, path: Path) -> tuple[int, int]:
    for quality in range(92, 61, -5):
        image.save(path, "WEBP", quality=quality, method=6, exact=True)
        if path.stat().st_size < 600_000:
            return quality, path.stat().st_size
    raise ValueError(f"{path.name} exceeds 600 KB")


def main() -> None:
    records = json.loads((BASE / "sources.json").read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = []
    for record in records:
        source = Image.open(BASE / "sources" / record["source"])
        rgba = knock_out_white(source) if record["keyWhite"] else source.convert("RGBA")
        width, height = record["size"]
        canvas = fit_on_canvas(rgba, width, height)
        output = OUTPUT / record["file"]
        quality, size = save_under_budget(canvas, output)
        alpha = canvas.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise ValueError(f"{record['file']} lacks full alpha range")
        report.append({
            "file": record["file"], "width": width, "height": height,
            "bytes": size, "quality": quality, "alpha": True,
            "whiteKeyed": record["keyWhite"],
        })
    (BASE / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
