---
title: Ladyada ESP32-S3 RGB TFT Experimentation
source: YouTube - Adafruit Industries (https://www.youtube.com/watch?v=-CgLnAP-sO4)
gemini_conversation: https://gemini.google.com/app/52db8be4ae8e56a7
created: 2026-01-27
tags: [esp32, tft, display, hardware, ai-coding, adafruit]
---

# The Desk of Ladyada - ESP32-S3 RGB TFT Experimentation

## Video Info
- **Channel**: Adafruit Industries
- **Host**: Ladyada
- **URL**: https://www.youtube.com/watch?v=-CgLnAP-sO4
- **Transcribed via**: Gemini (Ralph Loop /watch test)

## Key Timestamps

### Display Hacking & Hardware Updates
- **00:00:03** — Session intro, Open Source Hardware articles
- **00:01:41** — Display types showcase (bar, square with cap touch, round)
- **00:02:12** — ESP32-S3 eval board setup

### ESP32-S3 Custom PCB Design
- **00:03:45** — Custom PCB with ESP32-S3 + 8MB octal PS RAM
- **00:06:27** — Board features: capacitive touch, backlight drivers, RGB pins (5-6-5 bit)
- **00:07:27** — **TROUBLESHOOTING TIP**: Pins 35, 36, 37 are for octal PS RAM - cannot use for TFT!

### MJPEG Video Playback
- **00:10:37** — MJPEG player demo (concatenated JPEGs, simpler than H.264)
- **00:13:51** — Performance: 9-10 FPS on small display
- **00:17:15** — ffmpeg command for MP4→MJPEG conversion

### Using AI for Code Refactoring
- **00:19:12** — Manual reformatting is "annoying"
- **00:23:07** — ChatGPT Code Interpreter demo for Arduino RGB library
- **00:34:12** — AI needs specific prompts + constant verification

### The Great Search: Replacing Capacitors
- **00:37:41** — Finding replacement electrolytics for vintage gear
- **00:41:23** — Reading SMD capacitor codes (capacitance, voltage letter codes)
- **00:48:53** — DigiKey search walkthrough

## Key Takeaways

1. **Octal PS RAM is essential** for high-speed pixel data (25MHz clock) on larger displays
2. **Pin conflict trap**: ESP32-S3 pins 35-37 are reserved for octal RAM - using them causes hard faults
3. **MJPEG is microcontroller-friendly** - series of JPEGs, no complex codec decoding
4. **AI code refactoring works** but requires specific prompts and verification

## Technical Notes

- ST7701S driver chip for funky-shaped displays (non-rectangular)
- RGB config: 5 bits red, 6 bits green, 5 bits blue
- ffmpeg can resize and quality-adjust for MJPEG output

---
*Transcribed via /watch skill - Ralph Loop iteration 3*
