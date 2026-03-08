import http from 'k6/http';

export let options = {
    vus: 1, // רק משתמש אחד
    iterations: 1 // רק פעם אחת
};

export default function() {
    console.log('🚀 Starting request...');

    let res = http.get('https://band2.vercel.app');

    console.log('📥 Status:', res.status);
    console.log('📦 Bytes Received:', res.bytes);
}