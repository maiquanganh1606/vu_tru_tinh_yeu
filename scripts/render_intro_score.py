"""Render the original 28-second instrumental 'Cùng một quỹ đạo'.

Requires numpy and ffmpeg. No samples or third-party recordings are used.
Run from any directory: python scripts/render_intro_score.py
"""
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np

RATE = 32000
DURATION = 28
ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(200)
mix = np.zeros((RATE * DURATION, 2), dtype=np.float64)


def add(sound, start, gain=1, pan=0):
    offset = round(start * RATE)
    length = min(len(sound), len(mix) - offset)
    if length <= 0:
        return
    stereo = np.array([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)])
    mix[offset:offset+length] += sound[:length, None] * stereo * gain


def note(midi, start, length=2.6, gain=.15, pan=0, pad=False):
    t = np.arange(round(length*RATE)) / RATE
    freq = 440 * 2**((midi-69)/12)
    if pad:
        sound = sum(np.sin(2*np.pi*freq*detune*t) for detune in [.998, 1, 1.002]) / 3
        sound += .12*np.sin(2*np.pi*freq*2*t)
        envelope = np.minimum(t/1.4, 1) * np.minimum((length-t)/1.8, 1)
    else:
        sound = (np.sin(2*np.pi*freq*t)*np.exp(-t/1.2)
                 + .25*np.sin(2*np.pi*freq*2.002*t)*np.exp(-t/.5)
                 + .10*np.sin(2*np.pi*freq*3.004*t)*np.exp(-t/.22))
        envelope = (1-np.exp(-t/.008))*np.minimum((length-t)/.18, 1)
    sound *= envelope
    add(sound, start, gain, pan)
    if not pad:
        for delay, amount in [(.21, .22), (.43, .14), (.71, .08)]:
            add(sound, start+delay, gain*amount, -pan)


# Dmaj9 → Aadd9 → Bm7 → Gmaj9 → Dmaj9, one harmony per 5.6 seconds.
chords = [[50,57,61,64,66], [45,52,57,59,64], [47,54,57,62,66],
          [43,50,54,57,62], [50,57,61,64,66]]
for bar, chord in enumerate(chords):
    for i, pitch in enumerate(chord):
        note(pitch, bar*5.6, length=7, gain=.07 if bar == 0 else .09,
             pan=(i-2)*.25, pad=True)

# Spacious opening motif; the same notes become the travelling arpeggio.
for i, pitch in enumerate([74, 78, 81, 76]):
    note(pitch, .7+i*1.05, gain=.19, pan=(-1)**i*.25)
for step, start in enumerate(np.arange(5.6, 22.4, .35)):
    chord = chords[min(int(start/5.6), 3)]
    pitch = chord[[0,2,3,4,2,1,3,2][step%8]] + 24
    note(pitch, float(start), length=1.6, gain=.10+.035*np.sin(np.pi*(start-5.6)/16.8), pan=np.sin(step*.8)*.5)
    if step%2 == 0:
        t = np.arange(int(.38*RATE))/RATE
        # Soft low pulse, not a sharp drum transient.
        add(np.sin(2*np.pi*(55*t+2*(1-np.exp(-t*18)))) * (1-np.exp(-t*55))*np.exp(-t*13), float(start), .15)

# Gentle air swell and a rising, pitched shimmer before arrival.
for start, length, gain in [(5.0, 1.4, .012), (18.8, 3.6, .025), (26.3, 1.7, .025)]:
    noise = rng.standard_normal(round(length*RATE))
    noise = np.convolve(noise, np.ones(24)/24, mode='same')
    add(noise*np.sin(np.linspace(0, np.pi, len(noise)))**2, start, gain)
for i, pitch in enumerate([74, 76, 78, 81, 85, 88]):
    note(pitch, 22.4+i*.7, gain=.14, length=3, pan=(i%3-1)*.3)
for start in [24.0, 24.23, 25.4, 25.63]:
    t = np.arange(int(.25*RATE))/RATE
    add(np.sin(2*np.pi*58*t)*np.sin(np.pi*t/.25)**2, start, .09)
for pitch in [62, 69, 74, 78, 81, 88]:
    note(pitch, 26.8, length=1.2, gain=.14)

# Headroom and soft edges, including the entire white-out afterglow.
t = np.arange(len(mix))/RATE
mix *= (np.minimum(t/.8, 1)*np.minimum((DURATION-t)/.75, 1))[:, None]
mix = np.tanh(mix*1.2)
mix *= .79 / max(np.max(np.abs(mix)), .001)
with tempfile.TemporaryDirectory() as temp:
    wav_path = Path(temp)/'intro.wav'
    with wave.open(str(wav_path), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((mix*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav_path),
                    '-codec:a', 'libmp3lame', '-b:a', '128k', '-metadata', 'title=Cùng một quỹ đạo',
                    str(ROOT/'static'/'intro_score.mp3')], check=True)
print('Rendered static/intro_score.mp3 (28 seconds, original synthesized instrumental)')
