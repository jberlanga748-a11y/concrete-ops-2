#!/usr/bin/env python3
"""Apex local faster-whisper STT wrapper.

This script is intentionally narrow: it transcribes one local audio file,
writes one local transcript file, and prints content-free status metadata.
It does not call OpenAI or store microphone audio.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import site
import sys
import time


def _safe_text(value: object, limit: int = 160) -> str:
    return " ".join(str(value or "").split())[:limit]


def _add_nvidia_dll_directories() -> None:
    """Load CUDA runtime DLL dirs installed by NVIDIA Python wheels on Windows."""

    roots: list[pathlib.Path] = []
    try:
        roots.append(pathlib.Path(site.getusersitepackages()))
    except Exception:
        pass
    try:
        roots.extend(pathlib.Path(entry) for entry in site.getsitepackages())
    except Exception:
        pass

    dll_dirs: list[pathlib.Path] = []
    for root in roots:
        nvidia_root = root / "nvidia"
        if not nvidia_root.exists():
            continue
        dll_dirs.extend(path for path in nvidia_root.glob("*/bin") if path.is_dir())
        dll_dirs.extend(path for path in nvidia_root.glob("*/lib") if path.is_dir())

    for dll_dir in dll_dirs:
        dll_dir_text = str(dll_dir)
        if hasattr(os, "add_dll_directory"):
            try:
                os.add_dll_directory(dll_dir_text)
            except OSError:
                pass
        os.environ["PATH"] = dll_dir_text + os.pathsep + os.environ.get("PATH", "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apex local faster-whisper transcription wrapper")
    parser.add_argument("--model", required=True)
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu", "auto"])
    parser.add_argument("--compute_type", default="float16")
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--output_format", default="txt", choices=["txt"])
    parser.add_argument("--language", default="")
    parser.add_argument("audio_path")
    args = parser.parse_args()

    audio_path = pathlib.Path(args.audio_path)
    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if not audio_path.exists() or not audio_path.is_file():
        print(json.dumps({"ok": False, "error": "audio-missing"}), file=sys.stderr)
        return 2

    started = time.perf_counter()
    try:
        _add_nvidia_dll_directories()
        from faster_whisper import WhisperModel

        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
        )
        transcribe_args = {
            "beam_size": 1,
            "vad_filter": True,
            "word_timestamps": False,
        }
        if args.language:
            transcribe_args["language"] = args.language
        segments, info = model.transcribe(str(audio_path), **transcribe_args)
        transcript = " ".join(_safe_text(segment.text, 1000) for segment in segments).strip()
        transcript_path = output_dir / "transcript.txt"
        transcript_path.write_text(transcript, encoding="utf-8")
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        print(json.dumps({
            "ok": bool(transcript),
            "provider": "faster-whisper",
            "processor": "gpu" if args.device == "cuda" else args.device,
            "model": _safe_text(args.model, 120),
            "language": _safe_text(getattr(info, "language", "") or args.language, 40),
            "durationMs": elapsed_ms,
            "transcriptFile": transcript_path.name,
        }))
        return 0 if transcript else 3
    except Exception as exc:  # pragma: no cover - exercised by runtime fallback tests.
        print(json.dumps({
            "ok": False,
            "error": "faster-whisper-failed",
            "detail": _safe_text(exc, 220),
        }), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
