// Dynamic imports used in methods to avoid load crash
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

class VerificationService {
    constructor() {
        this.modelsLoaded = false;
    }

    // Models load lazily in verifyFace

    // 1. Check EXIF Date
    async verifyExifDate(file, expectedDateString) {
        try {
            const exifr = (await import('exifr')).default; // Dynamic Import
            const metadata = await exifr.parse(file);
            console.log("EXIF Data:", metadata);

            if (!metadata || !metadata.DateTimeOriginal) {
                // If strictly requiring EXIF:
                return { valid: false, reason: "No EXIF Date found. Is this an original photo?" };
            }

            const photoDate = new Date(metadata.DateTimeOriginal);
            const activityDate = new Date(expectedDateString); // "YYYY-MM-DD"

            const pStr = photoDate.toISOString().split('T')[0];
            const aStr = activityDate.toISOString().split('T')[0];

            if (pStr !== aStr) {
                return { valid: false, reason: `Date mismatch. Photo: ${pStr}, Activity: ${aStr}` };
            }

            return { valid: true };
        } catch (error) {
            console.error(error);
            return { valid: false, reason: "Error reading photo metadata" };
        }
    }

    // 2. Face Compare (Profile vs Evidence)
    async verifyFace(profileUrl, evidenceFile) {
        const faceapi = await import('face-api.js'); // Dynamic Import

        if (!this.modelsLoaded) {
            console.log("Loading Face API Models...");
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            this.modelsLoaded = true;
        }

        // Detect Face in Profile
        // CORS proxy might be needed if Supabase blocks
        const profileImg = await faceapi.fetchImage(profileUrl);
        const refDetection = await faceapi.detectSingleFace(profileImg).withFaceLandmarks().withFaceDescriptor();

        if (!refDetection) {
            return { match: false, reason: "No face detected in your Profile Picture. Please update it." };
        }

        // Detect Face in Evidence
        const evidenceImg = await faceapi.bufferToImage(evidenceFile);
        const evidenceDetection = await faceapi.detectSingleFace(evidenceImg).withFaceLandmarks().withFaceDescriptor();

        if (!evidenceDetection) {
            return { match: false, reason: "No face detected in the evidence photo." };
        }

        // Compare
        const faceMatcher = new faceapi.FaceMatcher(refDetection);
        const bestMatch = faceMatcher.findBestMatch(evidenceDetection.descriptor);

        console.log("Face Match Result:", bestMatch.toString());

        if (bestMatch.distance < 0.6) {
            return { match: true, score: bestMatch.distance };
        } else {
            return { match: false, reason: "Face verification failed. Not the same person." };
        }
    }
}

export const verificationService = new VerificationService();
