const fs = require('fs');
const path = require('path');

// Path to the exported users.json file
// Note: In a real scenario, we might want to pass this as an argument or find the latest export
const exportDir = '/run/media/dheena/Leave you files/squares_Updated/server/db_exports_2026-01-12T19-24-37-570Z';
const usersFilePath = path.join(exportDir, 'users.json');

try {
    if (!fs.existsSync(usersFilePath)) {
        console.error(`File not found: ${usersFilePath}`);
        process.exit(1);
    }

    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    const users = JSON.parse(usersData);

    console.log('User Emails and Roles:');
    console.log('------------------------------------------------');
    console.log(String('Email').padEnd(40) + ' | ' + 'Role');
    console.log('------------------------------------------------');

    users.forEach(user => {
        const email = user.email || 'No Email';
        const role = user.role || 'No Role';
        console.log(String(email).padEnd(40) + ' | ' + role);
    });
    console.log('------------------------------------------------');
    console.log(`Total Users: ${users.length}`);

} catch (error) {
    console.error('Error reading or parsing users file:', error);
}
