import http from 'k6/http';
import {
    check,
    sleep
} from 'k6';

// Configuration: Simulate 30 users over 1 minute
export const options = {
    vus: 30, // 30 Virtual Users (Students + Teachers)
    duration: '1m',
};

// Test Data
const users = [{
        username: 'teacher1',
        password: 'pass123'
    },
    {
        username: 'student1',
        password: 'pass123'
    },
    // ... add more users here
];

export default function() {
    // Pick a random user from the list
    const user = users[Math.floor(Math.random() * users.length)];

    const payload = JSON.stringify({
        username: user.username,
        password: user.password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Send Login Request
    let res = http.post('https://your-app.com/api/login', payload, params);

    // Check if login was successful (Status 200)
    check(res, {
        'login status is 200': (r) => r.status === 200,
        'login time < 500ms': (r) => r.timings.duration < 500,
    });

    // Wait a bit before next action (simulates human thinking)
    sleep(1);
}