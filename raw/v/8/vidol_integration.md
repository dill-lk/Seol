# SEOL AF v8 — LobeHub Vidol 3D Integration Guide

This guide explains how to connect the SEOL AF v8 emotional engine to LobeHub Vidol.

## Overview
Vidol uses an "Emotion Analysis" step to determine which VRM expression/motion to play. By using the `seol_bridge.py`, we intercept these calls and use SEOL's biological state to drive the 3D model.

## Setup Steps

### 1. Start the SEOL Bridge
Run the bridge script:
```bash
python seol_bridge.py
```

### 2. Configure Vidol
1. Set **Model Provider** to `OpenAI`.
2. Set **API Proxy Address** to `http://localhost:8000/v1`.

## Biological Sync
The bridge maps SEOL's `AFState` directly to Vidol's `Screenplay` format:
- **State: Love/Bond** -> `happy`
- **State: Rage/Anger** -> `angry`
- **State: Protective/Mother** -> `relaxed`
