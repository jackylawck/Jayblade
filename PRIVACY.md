# Privacy Policy & Data Governance Statement

**Last Updated**: August 2026

## 1. Compliance Framework Alignment
This project (*Jayblade 3D*) is designed in full compliance with global privacy regulations, including the **General Data Protection Regulation (EU GDPR)** and the **Hong Kong Personal Data (Privacy) Ordinance (PDPO)**.

## 2. Privacy by Design & Default
- **Zero Personal Data Collection**: We do not collect, store, transmit, or process any Personally Identifiable Information (PII), browser cookies, or telemetry identifiers.
- **Local Client Processing**: All 3D physics computations, customization settings, and user-uploaded 3D design files (.stl) are processed strictly within your browser's local RAM.
- **WebRTC P2P Encryption**: Multiplayer matches utilize direct Peer-to-Peer (WebRTC) datachannels encrypted via WebRTC DTLS/SRTP protocols. Room IDs (7-digit ephemeral numbers) are generated randomly and are not stored on any backend database.

## 3. Third-Party CDNs
External scripts (Three.js, Cannon.js, PeerJS) are loaded via trusted CDN providers with Subresource Integrity (SRI) hashes enabled to ensure zero script tampering.
