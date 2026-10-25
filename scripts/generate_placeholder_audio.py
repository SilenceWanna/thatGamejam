"""生成原创临时音频，只有 Python 标准库依赖。运行：python3 scripts/generate_placeholder_audio.py

完整乐句与四段文件使用同一 PCM 数据切分，片段严格等长，没有编码器附加的静音。
这只是可替换的原型声音，正式曲目路径统一在 assets.json 中配置。
"""

from array import array
from math import cos, exp, pi, sin
from pathlib import Path
import sys
import wave

SAMPLE_RATE = 22050
OUTPUT = Path(__file__).resolve().parents[1] / "public/content/level-01/audio"


def write_wav(name, samples):
    pcm = array("h", (int(max(-1, min(1, value)) * 32767) for value in samples))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(OUTPUT / name), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(SAMPLE_RATE)
        target.writeframes(pcm.tobytes())


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def bell_note(midi, duration=0.4):
    pitch = frequency(midi)
    result = []
    for index in range(round(duration * SAMPLE_RATE)):
        time = index / SAMPLE_RATE
        attack = min(1, time / 0.012)
        release = min(1, max(0, duration - time) / 0.05)
        envelope = attack * release * exp(-4 * time)
        tone = sin(2 * pi * pitch * time) + 0.23 * sin(2 * pi * pitch * 2 * time)
        result.append(tone * envelope * 0.42)
    return result


def create_phrase():
    melodies = {
        "mist": [60, 64, 67, 64],
        "bloom": [62, 65, 69, 67],
        "amber": [64, 67, 72, 71],
        "fern": [69, 67, 64, 60],
    }
    full = []
    for name, notes in melodies.items():
        segment = []
        for midi in notes:
            segment.extend(bell_note(midi))
        write_wav(f"fragment-{name}.wav", segment)
        full.extend(segment)
    write_wav("full-phrase.wav", full)


def create_ambience():
    length = 12.8
    samples = []
    for index in range(round(length * SAMPLE_RATE)):
        time = index / SAMPLE_RATE
        # 慢速包络两端回到零，循环处没有突变。
        envelope = (0.5 - 0.5 * cos(2 * pi * time / length)) * 0.11
        value = sum(sin(2 * pi * frequency(note) * time) for note in [48, 55, 60]) / 3
        samples.append(value * envelope)
    write_wav("ambience.wav", samples)


def create_effects():
    for filename, notes, duration in [
        ("collect.wav", [79, 84], 0.12),
        ("success.wav", [72, 76, 79, 84], 0.16),
        ("incorrect.wav", [55, 53], 0.15),
        ("jump.wav", [64, 69], 0.055),
        ("click.wav", [76], 0.06),
    ]:
        samples = []
        for note in notes:
            samples.extend(bell_note(note, duration))
        write_wav(filename, samples)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    create_phrase()
    create_ambience()
    create_effects()
    print(f"Generated 11 temporary WAV files in {OUTPUT}")
