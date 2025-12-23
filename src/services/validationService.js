import Tesseract from 'tesseract.js';

export const validationService = {
    // Analyze image text to find stats
    async analyzeStartImage(imageFile) {
        console.log("Starting OCR analysis...");

        // 1. Text Recognition
        const { data: { text } } = await Tesseract.recognize(
            imageFile,
            'eng',
            { logger: m => console.log(m) } // Optional logger
        );

        console.log("Extracted Text:", text);
        const lowerText = text.toLowerCase();

        // 2. Pattern Matching
        // Look for BPM (Heart Rate)
        // Matches: "140 bpm", "140bpm", "hr 140", "heart rate 140"
        const bpmMatch = lowerText.match(/(\d{2,3})\s?(bpm|hr|heart)/i) || lowerText.match(/(bpm|hr|heart)\s?(\d{2,3})/i);
        const detectedBpm = bpmMatch ? parseInt(bpmMatch[1] || bpmMatch[2]) : null;

        // Look for Duration (Time)
        // Matches: "30:00", "1:30:00", "30 min", "30m"
        const timeMatch = lowerText.match(/(\d{1,2}):(\d{2})/); // 00:00 format
        let detectedMinutes = null;

        if (timeMatch) {
            // Convert HH:MM or MM:SS to minutes roughly. 
            // Assuming MM:SS for shorter or HH:MM for longer. Context is hard.
            // Let's assume standard format checks.
            detectedMinutes = parseInt(timeMatch[1]);
        }

        return {
            text,
            detectedBpm,
            detectedMinutes,
            confidence: 0 // Placeholder, Tesseract gives word confidence but complex to aggregate
        };
    },

    // validate timestamp from file metadata
    validateTimestamp(file, targetDateString) {
        if (!file.lastModified) return { valid: false, reason: "No metadata found" };

        const fileDate = new Date(file.lastModified);
        const targetDate = new Date(targetDateString);

        // Reset hours to compare just the day
        const isSameDay =
            fileDate.getFullYear() === targetDate.getFullYear() &&
            fileDate.getMonth() === targetDate.getMonth() &&
            fileDate.getDate() === targetDate.getDate();

        return {
            valid: isSameDay,
            fileDate,
            reason: isSameDay ? "Matches" : `Photo taken on ${fileDate.toLocaleDateString()}, expected ${targetDate.toLocaleDateString()}`
        };
    }
};
