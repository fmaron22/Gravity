import * as faceapi from 'face-api.js';
import exifr from 'exifr';

// CDN for models to avoid local download issues
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

class VerificationService {
    constructor() {
        this.modelsLoaded = false;
    }

    async loadModels() {
        if (this.modelsLoaded) return;
        try {
            console.log("Loading Face API Models...");
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            this.modelsLoaded = true;
            console.log("Models Loaded");
        } catch (error) {
            console.error("Error loading face models:", error);
            throw new Error("Failed to load facial recognition models.");
        }
    }

    // 1. Check EXIF Date
    async verifyExifDate(file, expectedDateString) {
        try {
            // parsing logic
            const metadata = await exifr.parse(file);
            console.log("EXIF Data:", metadata);

            if (!metadata || !metadata.DateTimeOriginal) {
                // If strictly requiring EXIF:
                return { valid: false, reason: "No EXIF Date found. Is this an original photo?" };
            }

            const photoDate = new Date(metadata.DateTimeOriginal);
            const activityDate = new Date(expectedDateString); // "YYYY-MM-DD"

            // Check if Same Day (ignoring time for now, or match precisely?)
            // Strava date is YYYY-MM-DD.
            const pStr = photoDate.toISOString().split('T')[0];
            const aStr = activityDate.toISOString().split('T')[0];

            if (pStr !== aStr) {
                return { valid: false, reason: `Date mismatch. Photo: ${pStr}, Activity: ${aStr}` };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, reason: "Error reading photo metadata" };
        }
    }

    // 2. Face Compare (Profile vs Evidence)
    async verifyFace(profileUrl, evidenceFile) {
        if (!this.modelsLoaded) await this.loadModels();

        // Detect Face in Profile (configured reference)
        // Note: fetching profile image can struggle with CORS if not configured. 
        // Supabase storage usually allows CORS.
        const profileImg = await faceapi.fetchImage(profileUrl);
        const refDetection = await faceapi.detectSingleFace(profileImg).withFaceLandmarks().withFaceDescriptor();

        if (!refDetection) {
            return { match: false, reason: "No face detected in your Profile Picture. Please update it." };
        }

        // Detect Face in Evidence
        // Create HTMLImageElement from blob
        const evidenceImg = await faceapi.bufferToImage(evidenceFile);
        const evidenceDetection = await faceapi.detectSingleFace(evidenceImg).withFaceLandmarks().withFaceDescriptor();

        if (!evidenceDetection) {
            return { match: false, reason: "No face detected in the evidence photo." };
        }

        // Compare
        const faceMatcher = new faceapi.FaceMatcher(refDetection);
        const bestMatch = faceMatcher.findBestMatch(evidenceDetection.descriptor);

        // Threshold is usually 0.6. Distance < 0.6 means match.
        console.log("Face Match Result:", bestMatch.toString());

        if (bestMatch.distance < 0.6) {
            return { match: true, score: bestMatch.distance };
        } else {
            return { match: false, reason: "Face verification failed. Not the same person." };
        }
    }
}

export const verificationService = new VerificationService();
