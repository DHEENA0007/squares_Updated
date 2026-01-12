const fs = require('fs');
const path = require('path');

const exportDir = '/run/media/dheena/Leave you files/squares_Updated/server/db_exports_2026-01-12T19-24-37-570Z';

try {
    if (!fs.existsSync(exportDir)) {
        console.error(`Directory not found: ${exportDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(exportDir).filter(file => file.endsWith('.json'));

    console.log(`Found ${files.length} collections.`);
    console.log('------------------------------------------------');

    files.forEach(file => {
        const filePath = path.join(exportDir, file);
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const documents = JSON.parse(data);
            const count = documents.length;
            const collectionName = file.replace('.json', '');

            console.log(`Collection: ${collectionName}`);
            console.log(`Count: ${count}`);

            if (count > 0) {
                const sample = documents[0];
                const keys = Object.keys(sample).slice(0, 10).join(', '); // Show first 10 keys
                console.log(`Sample Keys: ${keys}`);

                // Try to print some meaningful identifier if it exists
                const id = sample._id || sample.id;
                const name = sample.name || sample.title || sample.email || sample.type || 'N/A';
                console.log(`Sample Item: ID=${id}, Name/Title=${name}`);
            } else {
                console.log('Content: (Empty)');
            }
            console.log('------------------------------------------------');

        } catch (err) {
            console.error(`Error reading ${file}:`, err.message);
        }
    });

} catch (error) {
    console.error('Error:', error);
}
