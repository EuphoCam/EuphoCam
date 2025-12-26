# **App Name**: CandidCam

## Core Features:

- Camera Access: Acquire and manage camera access using the `getUserMedia` API.
- Dual Mode Capture: Switch between 'Photo' and 'Video' capture modes seamlessly.
- Device Switching: Allow users to switch between front and rear cameras.
- Zoom Control: Implement zoom functionality via a slider, using `MediaStreamTrack.applyConstraints()` when supported.
- Mirroring Logic: Mirror the video preview in selfie mode while ensuring correct orientation on canvas capture for photos and videos.
- Asset Overlays: Enable users to select and upload PNG overlays for their photos and videos.
- Internationalization: Support multiple languages (English, Chinese, Japanese) with automatic detection and manual switching.

## Style Guidelines:

- Primary color: Deep blue (#2E5266) evoking trust and professionalism. Chosen for its versatile and contemporary feel in a mobile-first camera application. It is also quite different from common social media app palettes.
- Background color: Soft gray (#D3D5D8), offering a neutral and clean backdrop that keeps focus on the camera feed. Selected to align with the app's use case.
- Accent color: Muted violet (#725165), providing visual interest and highlighting key actions while still supporting a professional overall tone.
- Body and headline font: 'Inter', sans-serif, for a clean, modern, and readable interface.
- Lucide React icons: Simple and modern icons to ensure clarity and ease of use in the camera interface.
- Mobile-first design: A full-screen immersive camera interface, inspired by apps like Instagram and TikTok. Includes bottom-aligned controls for easy thumb access.
- Subtle transitions: Use subtle animations and transitions when switching between modes or applying zoom, providing a smooth user experience.