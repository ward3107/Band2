import http from 'k6/http';
import {
    check,
    sleep
} from 'k6';

export let options = {
    vus: 300, // 300 virtual users
    duration: '5m', // Run for 5 minutes
};

export default function() {
    let res = http.get('https://vocaband.com');
    check(res, {
        'status is 200': (r) => r.status === 200
    });
    sleep(1); // Wait 1 second between requests
}