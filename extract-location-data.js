import fs from 'fs';
import path from 'path';

console.log('Starting to process large JSON file...');

// Read the large JSON file
const inputFile = '5c2f62fe-5afa-4119-a499-fec9d604d5bd.json';
const outputFile = 'loca.json';

try {
  console.log('Reading input file...');
  const rawData = fs.readFileSync(inputFile, 'utf8');
  console.log('Parsing JSON...');
  const data = JSON.parse(rawData);
  
  // Extract only the required fields from records
  const extractedData = {
    records: []
  };
  
  if (data.records && Array.isArray(data.records)) {
    console.log(`Processing ${data.records.length} records...`);
    
    extractedData.records = data.records.map((record, index) => {
      if (index % 10000 === 0) {
        console.log(`Processed ${index} records...`);
      }
      
      return {
        state: record.state || '',
        district: record.district || '',
        city: record.city || '',
        pincode: record.pincode || ''
      };
    });
    
    console.log(`Extracted ${extractedData.records.length} records`);
  } else {
    console.log('No records array found in the input file');
  }
  
  // Write the extracted data to the output file
  console.log('Writing output file...');
  fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2));
  
  console.log(`✅ Successfully created ${outputFile} with ${extractedData.records.length} records`);
  console.log(`Original file size: ${(fs.statSync(inputFile).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`New file size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
  
} catch (error) {
  console.error('❌ Error processing file:', error.message);
  process.exit(1);
}
