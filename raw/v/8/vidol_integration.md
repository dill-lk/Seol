# SEOL AF v8 — LobeHub Vidol 3D Integration Guide

This guide explains how to connect the SEOL AF v8 emotional engine to LobeHub Vidol.

## Overview
Vidol uses an "Emotion Analysis" step to determine which VRM expression/motion to play. By using the `seol_bridge.py`, we intercept these calls and use SEOL's biological state to drive the 3D model.

## Setup Steps (Option A: Local Server)

### 1. Start the SEOL Bridge
Run the bridge script:
```bash
python seol_bridge.py
```

### 2. Configure Vidol
1. Set **Model Provider** to `OpenAI`.
2. Set **API Proxy Address** to `http://localhost:8000/v1`.

## Setup Steps (Option B: Google Colab - Recommended)

### 1. Open the Colab Notebook
Open `raw/v/8/seol_vidol_colab.ipynb` in Google Colab.

### 2. Run the Cells
Execute the cells in order. The last cell will provide a public URL via `localtunnel` (e.g., `https://funny-cats-cry.loca.lt`).

### 3. Configure Vidol
1. Set **Model Provider** to `OpenAI`.
2. Set **API Proxy Address** to `[YOUR_COLAB_URL]/v1`.

## Biological Sync
The bridge maps SEOL's `AFState` directly to Vidol's `Screenplay` format:
- **State: Love/Bond** -> `happy`
- **State: Rage/Anger** -> `angry`
- **State: Protective/Mother** -> `relaxed`
