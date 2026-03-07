// polite-test.js - Human-like behavior
export let options = {
    vus: 20, // Start small
    duration: '5m', // Longer duration, lower intensity
    ramping: {
        rate: 1, // Add 1 user per second
        period: '1m',
    },
};

export default function() {
    // Add realistic browser headers
    let params = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
        },
    };

    http.get('https://band2.vercel.app', params);
    sleep(Math.random() * 3 + 1); // Random 1-4 second delay (human-like)
}