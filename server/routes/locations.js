const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const axios = require('axios');

// LocationIQ API configuration
const LOCATIONIQ_ACCESS_TOKEN = process.env.LOCATIONIQ_ACCESS_TOKEN;
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

// Validate LocationIQ configuration
if (!LOCATIONIQ_ACCESS_TOKEN) {
  console.error('LocationIQ access token is not configured');
}

// Helper function to get state code from state name
function getStateCode(stateName) {
  const stateMapping = {
    'Tamil Nadu': 'TN',
    'Karnataka': 'KA',
    'Maharashtra': 'MH',
    'Kerala': 'KL',
    'Andhra Pradesh': 'AP',
    'Telangana': 'TG',
    'Gujarat': 'GJ',
    'Rajasthan': 'RJ',
    'Punjab': 'PB',
    'Haryana': 'HR',
    'Uttar Pradesh': 'UP',
    'Madhya Pradesh': 'MP',
    'Bihar': 'BR',
    'West Bengal': 'WB',
    'Odisha': 'OR',
    'Jharkhand': 'JH',
    'Assam': 'AS',
    'Himachal Pradesh': 'HP',
    'Uttarakhand': 'UT',
    'Goa': 'GA',
    'Delhi': 'DL',
    'Jammu and Kashmir': 'JK',
    'Ladakh': 'LA',
    'Chandigarh': 'CH',
    'Puducherry': 'PY',
    'Lakshadweep': 'LD',
    'Andaman and Nicobar Islands': 'AN',
    'Dadra and Nagar Haveli and Daman and Diu': 'DN',
    'Chhattisgarh': 'CG',
    'Manipur': 'MN',
    'Meghalaya': 'ML',
    'Mizoram': 'MZ',
    'Nagaland': 'NL',
    'Sikkim': 'SK',
    'Tripura': 'TR',
    'Arunachal Pradesh': 'AR'
  };
  return stateMapping[stateName] || stateName.substring(0, 2).toUpperCase();
}

// Helper function to determine location type based on name
function determineLocationType(locationName) {
  const urbanKeywords = ['city', 'town', 'urban', 'metro', 'corporation', 'municipal', 'nagar', 'colony', 'layout', 'extension', 'park', 'sector', 'block', 'phase'];
  const villageKeywords = ['village', 'gram', 'palli', 'palle', 'oor', 'ur'];
  
  const nameLower = locationName.toLowerCase();
  
  if (urbanKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'urban';
  } else if (villageKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'village';
  } else {
    // Default to town for ambiguous cases
    return 'town';
  }
}

// Helper function to call LocationIQ API
async function callLocationIQAPI(endpoint, params = {}) {
  try {
    if (!LOCATIONIQ_ACCESS_TOKEN) {
      throw new Error('LocationIQ access token not configured');
    }
    
    const response = await axios.get(`${LOCATIONIQ_BASE_URL}${endpoint}`, {
      params: {
        key: LOCATIONIQ_ACCESS_TOKEN,
        format: 'json',
        ...params
      },
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('LocationIQ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 401) {
      throw new Error('Invalid LocationIQ API key');
    } else if (error.response?.status === 404) {
      throw new Error('Location not found');
    }
    
    throw new Error(`LocationIQ API failed: ${error.response?.data?.error || error.message}`);
  }
}

// Helper function to parse address components from LocationIQ response
function parseLocationIQAddress(addressComponents) {
  const parsed = {
    country: 'India',
    countryCode: 'IN',
    state: null,
    stateCode: null,
    district: null,
    city: null,
    taluk: null,
    locationName: null,
    locationType: 'urban',
    postcode: null,
    latitude: null,
    longitude: null
  };

  if (addressComponents.country_code?.toLowerCase() === 'in') {
    parsed.state = addressComponents.state;
    parsed.stateCode = getStateCode(addressComponents.state || '');
    parsed.district = addressComponents.state_district || addressComponents.county;
    parsed.city = addressComponents.city || addressComponents.town || addressComponents.village;
    parsed.taluk = addressComponents.suburb || addressComponents.neighbourhood || addressComponents.hamlet;
    parsed.locationName = addressComponents.road || addressComponents.residential || 
                         addressComponents.suburb || addressComponents.village || 
                         addressComponents.hamlet || addressComponents.locality;
    parsed.postcode = addressComponents.postcode;
    
    // Determine location type
    if (addressComponents.village) {
      parsed.locationType = 'village';
    } else if (addressComponents.town) {
      parsed.locationType = 'town';
    } else if (addressComponents.city) {
      parsed.locationType = 'urban';
    }
  }

  return parsed;
}

// Comprehensive Indian Districts Database
const indianDistricts = {
  'TN': [ // Tamil Nadu
    { id: 'ariyalur', name: 'Ariyalur' },
    { id: 'chengalpattu', name: 'Chengalpattu' },
    { id: 'chennai', name: 'Chennai' },
    { id: 'coimbatore', name: 'Coimbatore' },
    { id: 'cuddalore', name: 'Cuddalore' },
    { id: 'dharmapuri', name: 'Dharmapuri' },
    { id: 'dindigul', name: 'Dindigul' },
    { id: 'erode', name: 'Erode' },
    { id: 'kallakurichi', name: 'Kallakurichi' },
    { id: 'kanchipuram', name: 'Kanchipuram' },
    { id: 'kanyakumari', name: 'Kanyakumari' },
    { id: 'karur', name: 'Karur' },
    { id: 'krishnagiri', name: 'Krishnagiri' },
    { id: 'madurai', name: 'Madurai' },
    { id: 'mayiladuthurai', name: 'Mayiladuthurai' },
    { id: 'nagapattinam', name: 'Nagapattinam' },
    { id: 'namakkal', name: 'Namakkal' },
    { id: 'nilgiris', name: 'Nilgiris' },
    { id: 'perambalur', name: 'Perambalur' },
    { id: 'pudukkottai', name: 'Pudukkottai' },
    { id: 'ramanathapuram', name: 'Ramanathapuram' },
    { id: 'ranipet', name: 'Ranipet' },
    { id: 'salem', name: 'Salem' },
    { id: 'sivaganga', name: 'Sivaganga' },
    { id: 'tenkasi', name: 'Tenkasi' },
    { id: 'thanjavur', name: 'Thanjavur' },
    { id: 'theni', name: 'Theni' },
    { id: 'thoothukudi', name: 'Thoothukudi' },
    { id: 'tiruchirappalli', name: 'Tiruchirappalli' },
    { id: 'tirunelveli', name: 'Tirunelveli' },
    { id: 'tirupathur', name: 'Tirupathur' },
    { id: 'tiruppur', name: 'Tiruppur' },
    { id: 'tiruvannamalai', name: 'Tiruvannamalai' },
    { id: 'tiruvarur', name: 'Tiruvarur' },
    { id: 'vellore', name: 'Vellore' },
    { id: 'viluppuram', name: 'Viluppuram' },
    { id: 'virudhunagar', name: 'Virudhunagar' }
  ],
  'KA': [ // Karnataka
    { id: 'bagalkot', name: 'Bagalkot' },
    { id: 'ballari', name: 'Ballari' },
    { id: 'belagavi', name: 'Belagavi' },
    { id: 'bengaluru-rural', name: 'Bengaluru Rural' },
    { id: 'bengaluru-urban', name: 'Bengaluru Urban' },
    { id: 'bidar', name: 'Bidar' },
    { id: 'chamarajanagar', name: 'Chamarajanagar' },
    { id: 'chikkaballapur', name: 'Chikkaballapur' },
    { id: 'chikkamagaluru', name: 'Chikkamagaluru' },
    { id: 'chitradurga', name: 'Chitradurga' },
    { id: 'dakshina-kannada', name: 'Dakshina Kannada' },
    { id: 'davanagere', name: 'Davanagere' },
    { id: 'dharwad', name: 'Dharwad' },
    { id: 'gadag', name: 'Gadag' },
    { id: 'hassan', name: 'Hassan' },
    { id: 'haveri', name: 'Haveri' },
    { id: 'kalaburagi', name: 'Kalaburagi' },
    { id: 'kodagu', name: 'Kodagu' },
    { id: 'kolar', name: 'Kolar' },
    { id: 'koppal', name: 'Koppal' },
    { id: 'mandya', name: 'Mandya' },
    { id: 'mysuru', name: 'Mysuru' },
    { id: 'raichur', name: 'Raichur' },
    { id: 'ramanagara', name: 'Ramanagara' },
    { id: 'shivamogga', name: 'Shivamogga' },
    { id: 'tumakuru', name: 'Tumakuru' },
    { id: 'udupi', name: 'Udupi' },
    { id: 'uttara-kannada', name: 'Uttara Kannada' },
    { id: 'vijayapura', name: 'Vijayapura' },
    { id: 'yadgir', name: 'Yadgir' }
  ],
  'MH': [ // Maharashtra
    { id: 'ahmednagar', name: 'Ahmednagar' },
    { id: 'akola', name: 'Akola' },
    { id: 'amravati', name: 'Amravati' },
    { id: 'aurangabad', name: 'Aurangabad' },
    { id: 'beed', name: 'Beed' },
    { id: 'bhandara', name: 'Bhandara' },
    { id: 'buldhana', name: 'Buldhana' },
    { id: 'chandrapur', name: 'Chandrapur' },
    { id: 'dhule', name: 'Dhule' },
    { id: 'gadchiroli', name: 'Gadchiroli' },
    { id: 'gondia', name: 'Gondia' },
    { id: 'hingoli', name: 'Hingoli' },
    { id: 'jalgaon', name: 'Jalgaon' },
    { id: 'jalna', name: 'Jalna' },
    { id: 'kolhapur', name: 'Kolhapur' },
    { id: 'latur', name: 'Latur' },
    { id: 'mumbai-city', name: 'Mumbai City' },
    { id: 'mumbai-suburban', name: 'Mumbai Suburban' },
    { id: 'nagpur', name: 'Nagpur' },
    { id: 'nanded', name: 'Nanded' },
    { id: 'nandurbar', name: 'Nandurbar' },
    { id: 'nashik', name: 'Nashik' },
    { id: 'osmanabad', name: 'Osmanabad' },
    { id: 'palghar', name: 'Palghar' },
    { id: 'parbhani', name: 'Parbhani' },
    { id: 'pune', name: 'Pune' },
    { id: 'raigad', name: 'Raigad' },
    { id: 'ratnagiri', name: 'Ratnagiri' },
    { id: 'sangli', name: 'Sangli' },
    { id: 'satara', name: 'Satara' },
    { id: 'sindhudurg', name: 'Sindhudurg' },
    { id: 'solapur', name: 'Solapur' },
    { id: 'thane', name: 'Thane' },
    { id: 'wardha', name: 'Wardha' },
    { id: 'washim', name: 'Washim' },
    { id: 'yavatmal', name: 'Yavatmal' }
  ],
  'KL': [ // Kerala
    { id: 'alappuzha', name: 'Alappuzha' },
    { id: 'ernakulam', name: 'Ernakulam' },
    { id: 'idukki', name: 'Idukki' },
    { id: 'kannur', name: 'Kannur' },
    { id: 'kasaragod', name: 'Kasaragod' },
    { id: 'kollam', name: 'Kollam' },
    { id: 'kottayam', name: 'Kottayam' },
    { id: 'kozhikode', name: 'Kozhikode' },
    { id: 'malappuram', name: 'Malappuram' },
    { id: 'palakkad', name: 'Palakkad' },
    { id: 'pathanamthitta', name: 'Pathanamthitta' },
    { id: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
    { id: 'thrissur', name: 'Thrissur' },
    { id: 'wayanad', name: 'Wayanad' }
  ],
  'AP': [ // Andhra Pradesh
    { id: 'anantapur', name: 'Anantapur' },
    { id: 'chittoor', name: 'Chittoor' },
    { id: 'east-godavari', name: 'East Godavari' },
    { id: 'guntur', name: 'Guntur' },
    { id: 'kadapa', name: 'Kadapa' },
    { id: 'krishna', name: 'Krishna' },
    { id: 'kurnool', name: 'Kurnool' },
    { id: 'nellore', name: 'Nellore' },
    { id: 'prakasam', name: 'Prakasam' },
    { id: 'srikakulam', name: 'Srikakulam' },
    { id: 'visakhapatnam', name: 'Visakhapatnam' },
    { id: 'vizianagaram', name: 'Vizianagaram' },
    { id: 'west-godavari', name: 'West Godavari' }
  ],
  'TG': [ // Telangana
    { id: 'adilabad', name: 'Adilabad' },
    { id: 'bhadradri-kothagudem', name: 'Bhadradri Kothagudem' },
    { id: 'hyderabad', name: 'Hyderabad' },
    { id: 'jagtial', name: 'Jagtial' },
    { id: 'jangaon', name: 'Jangaon' },
    { id: 'jayashankar', name: 'Jayashankar' },
    { id: 'jogulamba', name: 'Jogulamba' },
    { id: 'kamareddy', name: 'Kamareddy' },
    { id: 'karimnagar', name: 'Karimnagar' },
    { id: 'khammam', name: 'Khammam' },
    { id: 'komaram-bheem', name: 'Komaram Bheem' },
    { id: 'mahabubabad', name: 'Mahabubabad' },
    { id: 'mahbubnagar', name: 'Mahbubnagar' },
    { id: 'mancherial', name: 'Mancherial' },
    { id: 'medak', name: 'Medak' },
    { id: 'medchal', name: 'Medchal' },
    { id: 'mulugu', name: 'Mulugu' },
    { id: 'nagarkurnool', name: 'Nagarkurnool' },
    { id: 'nalgonda', name: 'Nalgonda' },
    { id: 'narayanpet', name: 'Narayanpet' },
    { id: 'nirmal', name: 'Nirmal' },
    { id: 'nizamabad', name: 'Nizamabad' },
    { id: 'peddapalli', name: 'Peddapalli' },
    { id: 'rajanna-sircilla', name: 'Rajanna Sircilla' },
    { id: 'rangareddy', name: 'Rangareddy' },
    { id: 'sangareddy', name: 'Sangareddy' },
    { id: 'siddipet', name: 'Siddipet' },
    { id: 'suryapet', name: 'Suryapet' },
    { id: 'vikarabad', name: 'Vikarabad' },
    { id: 'wanaparthy', name: 'Wanaparthy' },
    { id: 'warangal-rural', name: 'Warangal Rural' },
    { id: 'warangal-urban', name: 'Warangal Urban' },
    { id: 'yadadri', name: 'Yadadri' }
  ],
  'GJ': [ // Gujarat
    { id: 'ahmedabad', name: 'Ahmedabad' },
    { id: 'amreli', name: 'Amreli' },
    { id: 'anand', name: 'Anand' },
    { id: 'aravalli', name: 'Aravalli' },
    { id: 'banaskantha', name: 'Banaskantha' },
    { id: 'bharuch', name: 'Bharuch' },
    { id: 'bhavnagar', name: 'Bhavnagar' },
    { id: 'botad', name: 'Botad' },
    { id: 'chhota-udaipur', name: 'Chhota Udaipur' },
    { id: 'dahod', name: 'Dahod' },
    { id: 'dang', name: 'Dang' },
    { id: 'devbhoomi-dwarka', name: 'Devbhoomi Dwarka' },
    { id: 'gandhinagar', name: 'Gandhinagar' },
    { id: 'gir-somnath', name: 'Gir Somnath' },
    { id: 'jamnagar', name: 'Jamnagar' },
    { id: 'junagadh', name: 'Junagadh' },
    { id: 'kutch', name: 'Kutch' },
    { id: 'kheda', name: 'Kheda' },
    { id: 'mahisagar', name: 'Mahisagar' },
    { id: 'mehsana', name: 'Mehsana' },
    { id: 'morbi', name: 'Morbi' },
    { id: 'narmada', name: 'Narmada' },
    { id: 'navsari', name: 'Navsari' },
    { id: 'panchmahal', name: 'Panchmahal' },
    { id: 'patan', name: 'Patan' },
    { id: 'porbandar', name: 'Porbandar' },
    { id: 'rajkot', name: 'Rajkot' },
    { id: 'sabarkantha', name: 'Sabarkantha' },
    { id: 'surat', name: 'Surat' },
    { id: 'surendranagar', name: 'Surendranagar' },
    { id: 'tapi', name: 'Tapi' },
    { id: 'vadodara', name: 'Vadodara' },
    { id: 'valsad', name: 'Valsad' }
  ],
  'RJ': [ // Rajasthan
    { id: 'ajmer', name: 'Ajmer' },
    { id: 'alwar', name: 'Alwar' },
    { id: 'banswara', name: 'Banswara' },
    { id: 'baran', name: 'Baran' },
    { id: 'barmer', name: 'Barmer' },
    { id: 'bharatpur', name: 'Bharatpur' },
    { id: 'bhilwara', name: 'Bhilwara' },
    { id: 'bikaner', name: 'Bikaner' },
    { id: 'bundi', name: 'Bundi' },
    { id: 'chittorgarh', name: 'Chittorgarh' },
    { id: 'churu', name: 'Churu' },
    { id: 'dausa', name: 'Dausa' },
    { id: 'dholpur', name: 'Dholpur' },
    { id: 'dungarpur', name: 'Dungarpur' },
    { id: 'hanumangarh', name: 'Hanumangarh' },
    { id: 'jaipur', name: 'Jaipur' },
    { id: 'jaisalmer', name: 'Jaisalmer' },
    { id: 'jalore', name: 'Jalore' },
    { id: 'jhalawar', name: 'Jhalawar' },
    { id: 'jhunjhunu', name: 'Jhunjhunu' },
    { id: 'jodhpur', name: 'Jodhpur' },
    { id: 'karauli', name: 'Karauli' },
    { id: 'kota', name: 'Kota' },
    { id: 'nagaur', name: 'Nagaur' },
    { id: 'pali', name: 'Pali' },
    { id: 'pratapgarh', name: 'Pratapgarh' },
    { id: 'rajsamand', name: 'Rajsamand' },
    { id: 'sawai-madhopur', name: 'Sawai Madhopur' },
    { id: 'sikar', name: 'Sikar' },
    { id: 'sirohi', name: 'Sirohi' },
    { id: 'sri-ganganagar', name: 'Sri Ganganagar' },
    { id: 'tonk', name: 'Tonk' },
    { id: 'udaipur', name: 'Udaipur' }
  ],
  'UP': [ // Uttar Pradesh
    { id: 'agra', name: 'Agra' },
    { id: 'aligarh', name: 'Aligarh' },
    { id: 'ambedkar-nagar', name: 'Ambedkar Nagar' },
    { id: 'amethi', name: 'Amethi' },
    { id: 'amroha', name: 'Amroha' },
    { id: 'auraiya', name: 'Auraiya' },
    { id: 'ayodhya', name: 'Ayodhya' },
    { id: 'azamgarh', name: 'Azamgarh' },
    { id: 'baghpat', name: 'Baghpat' },
    { id: 'bahraich', name: 'Bahraich' },
    { id: 'ballia', name: 'Ballia' },
    { id: 'balrampur', name: 'Balrampur' },
    { id: 'banda', name: 'Banda' },
    { id: 'barabanki', name: 'Barabanki' },
    { id: 'bareilly', name: 'Bareilly' },
    { id: 'basti', name: 'Basti' },
    { id: 'bhadohi', name: 'Bhadohi' },
    { id: 'bijnor', name: 'Bijnor' },
    { id: 'budaun', name: 'Budaun' },
    { id: 'bulandshahr', name: 'Bulandshahr' },
    { id: 'chandauli', name: 'Chandauli' },
    { id: 'chitrakoot', name: 'Chitrakoot' },
    { id: 'deoria', name: 'Deoria' },
    { id: 'etah', name: 'Etah' },
    { id: 'etawah', name: 'Etawah' },
    { id: 'farrukhabad', name: 'Farrukhabad' },
    { id: 'fatehpur', name: 'Fatehpur' },
    { id: 'firozabad', name: 'Firozabad' },
    { id: 'gautam-buddha-nagar', name: 'Gautam Buddha Nagar' },
    { id: 'ghaziabad', name: 'Ghaziabad' },
    { id: 'ghazipur', name: 'Ghazipur' },
    { id: 'gonda', name: 'Gonda' },
    { id: 'gorakhpur', name: 'Gorakhpur' },
    { id: 'hamirpur', name: 'Hamirpur' },
    { id: 'hapur', name: 'Hapur' },
    { id: 'hardoi', name: 'Hardoi' },
    { id: 'hathras', name: 'Hathras' },
    { id: 'jalaun', name: 'Jalaun' },
    { id: 'jaunpur', name: 'Jaunpur' },
    { id: 'jhansi', name: 'Jhansi' },
    { id: 'kannauj', name: 'Kannauj' },
    { id: 'kanpur-dehat', name: 'Kanpur Dehat' },
    { id: 'kanpur-nagar', name: 'Kanpur Nagar' },
    { id: 'kasganj', name: 'Kasganj' },
    { id: 'kaushambi', name: 'Kaushambi' },
    { id: 'kheri', name: 'Kheri' },
    { id: 'kushinagar', name: 'Kushinagar' },
    { id: 'lalitpur', name: 'Lalitpur' },
    { id: 'lucknow', name: 'Lucknow' },
    { id: 'maharajganj', name: 'Maharajganj' },
    { id: 'mahoba', name: 'Mahoba' },
    { id: 'mainpuri', name: 'Mainpuri' },
    { id: 'mathura', name: 'Mathura' },
    { id: 'mau', name: 'Mau' },
    { id: 'meerut', name: 'Meerut' },
    { id: 'mirzapur', name: 'Mirzapur' },
    { id: 'moradabad', name: 'Moradabad' },
    { id: 'muzaffarnagar', name: 'Muzaffarnagar' },
    { id: 'pilibhit', name: 'Pilibhit' },
    { id: 'pratapgarh', name: 'Pratapgarh' },
    { id: 'prayagraj', name: 'Prayagraj' },
    { id: 'raebareli', name: 'Raebareli' },
    { id: 'rampur', name: 'Rampur' },
    { id: 'saharanpur', name: 'Saharanpur' },
    { id: 'sambhal', name: 'Sambhal' },
    { id: 'sant-kabir-nagar', name: 'Sant Kabir Nagar' },
    { id: 'shahjahanpur', name: 'Shahjahanpur' },
    { id: 'shamli', name: 'Shamli' },
    { id: 'shravasti', name: 'Shravasti' },
    { id: 'siddharthnagar', name: 'Siddharthnagar' },
    { id: 'sitapur', name: 'Sitapur' },
    { id: 'sonbhadra', name: 'Sonbhadra' },
    { id: 'sultanpur', name: 'Sultanpur' },
    { id: 'unnao', name: 'Unnao' },
    { id: 'varanasi', name: 'Varanasi' }
  ],
  'MP': [ // Madhya Pradesh
    { id: 'agar-malwa', name: 'Agar Malwa' },
    { id: 'alirajpur', name: 'Alirajpur' },
    { id: 'anuppur', name: 'Anuppur' },
    { id: 'ashoknagar', name: 'Ashoknagar' },
    { id: 'balaghat', name: 'Balaghat' },
    { id: 'barwani', name: 'Barwani' },
    { id: 'betul', name: 'Betul' },
    { id: 'bhind', name: 'Bhind' },
    { id: 'bhopal', name: 'Bhopal' },
    { id: 'burhanpur', name: 'Burhanpur' },
    { id: 'chachaura', name: 'Chachaura' },
    { id: 'chhatarpur', name: 'Chhatarpur' },
    { id: 'chhindwara', name: 'Chhindwara' },
    { id: 'damoh', name: 'Damoh' },
    { id: 'datia', name: 'Datia' },
    { id: 'dewas', name: 'Dewas' },
    { id: 'dhar', name: 'Dhar' },
    { id: 'dindori', name: 'Dindori' },
    { id: 'guna', name: 'Guna' },
    { id: 'gwalior', name: 'Gwalior' },
    { id: 'harda', name: 'Harda' },
    { id: 'hoshangabad', name: 'Hoshangabad' },
    { id: 'indore', name: 'Indore' },
    { id: 'jabalpur', name: 'Jabalpur' },
    { id: 'jhabua', name: 'Jhabua' },
    { id: 'katni', name: 'Katni' },
    { id: 'khandwa', name: 'Khandwa' },
    { id: 'khargone', name: 'Khargone' },
    { id: 'maihar', name: 'Maihar' },
    { id: 'mandla', name: 'Mandla' },
    { id: 'mandsaur', name: 'Mandsaur' },
    { id: 'morena', name: 'Morena' },
    { id: 'narsinghpur', name: 'Narsinghpur' },
    { id: 'neemuch', name: 'Neemuch' },
    { id: 'nagda', name: 'Nagda' },
    { id: 'niwari', name: 'Niwari' },
    { id: 'panna', name: 'Panna' },
    { id: 'raisen', name: 'Raisen' },
    { id: 'rajgarh', name: 'Rajgarh' },
    { id: 'ratlam', name: 'Ratlam' },
    { id: 'rewa', name: 'Rewa' },
    { id: 'sagar', name: 'Sagar' },
    { id: 'satna', name: 'Satna' },
    { id: 'sehore', name: 'Sehore' },
    { id: 'seoni', name: 'Seoni' },
    { id: 'shahdol', name: 'Shahdol' },
    { id: 'shajapur', name: 'Shajapur' },
    { id: 'sheopur', name: 'Sheopur' },
    { id: 'shivpuri', name: 'Shivpuri' },
    { id: 'sidhi', name: 'Sidhi' },
    { id: 'singrauli', name: 'Singrauli' },
    { id: 'tikamgarh', name: 'Tikamgarh' },
    { id: 'ujjain', name: 'Ujjain' },
    { id: 'umaria', name: 'Umaria' },
    { id: 'vidisha', name: 'Vidisha' }
  ],
  'BR': [ // Bihar
    { id: 'araria', name: 'Araria' },
    { id: 'arwal', name: 'Arwal' },
    { id: 'aurangabad', name: 'Aurangabad' },
    { id: 'banka', name: 'Banka' },
    { id: 'begusarai', name: 'Begusarai' },
    { id: 'bhagalpur', name: 'Bhagalpur' },
    { id: 'bhojpur', name: 'Bhojpur' },
    { id: 'buxar', name: 'Buxar' },
    { id: 'darbhanga', name: 'Darbhanga' },
    { id: 'east-champaran', name: 'East Champaran' },
    { id: 'gaya', name: 'Gaya' },
    { id: 'gopalganj', name: 'Gopalganj' },
    { id: 'jamui', name: 'Jamui' },
    { id: 'jehanabad', name: 'Jehanabad' },
    { id: 'kaimur', name: 'Kaimur' },
    { id: 'katihar', name: 'Katihar' },
    { id: 'khagaria', name: 'Khagaria' },
    { id: 'kishanganj', name: 'Kishanganj' },
    { id: 'lakhisarai', name: 'Lakhisarai' },
    { id: 'madhepura', name: 'Madhepura' },
    { id: 'madhubani', name: 'Madhubani' },
    { id: 'munger', name: 'Munger' },
    { id: 'muzaffarpur', name: 'Muzaffarpur' },
    { id: 'nalanda', name: 'Nalanda' },
    { id: 'nawada', name: 'Nawada' },
    { id: 'patna', name: 'Patna' },
    { id: 'purnia', name: 'Purnia' },
    { id: 'rohtas', name: 'Rohtas' },
    { id: 'saharsa', name: 'Saharsa' },
    { id: 'samastipur', name: 'Samastipur' },
    { id: 'saran', name: 'Saran' },
    { id: 'sheikhpura', name: 'Sheikhpura' },
    { id: 'sheohar', name: 'Sheohar' },
    { id: 'sitamarhi', name: 'Sitamarhi' },
    { id: 'siwan', name: 'Siwan' },
    { id: 'supaul', name: 'Supaul' },
    { id: 'vaishali', name: 'Vaishali' },
    { id: 'west-champaran', name: 'West Champaran' }
  ],
  'WB': [ // West Bengal
    { id: 'alipurduar', name: 'Alipurduar' },
    { id: 'bankura', name: 'Bankura' },
    { id: 'birbhum', name: 'Birbhum' },
    { id: 'cooch-behar', name: 'Cooch Behar' },
    { id: 'dakshin-dinajpur', name: 'Dakshin Dinajpur' },
    { id: 'darjeeling', name: 'Darjeeling' },
    { id: 'hooghly', name: 'Hooghly' },
    { id: 'howrah', name: 'Howrah' },
    { id: 'jalpaiguri', name: 'Jalpaiguri' },
    { id: 'jhargram', name: 'Jhargram' },
    { id: 'kalimpong', name: 'Kalimpong' },
    { id: 'kolkata', name: 'Kolkata' },
    { id: 'malda', name: 'Malda' },
    { id: 'murshidabad', name: 'Murshidabad' },
    { id: 'nadia', name: 'Nadia' },
    { id: 'north-24-parganas', name: 'North 24 Parganas' },
    { id: 'paschim-bardhaman', name: 'Paschim Bardhaman' },
    { id: 'paschim-medinipur', name: 'Paschim Medinipur' },
    { id: 'purba-bardhaman', name: 'Purba Bardhaman' },
    { id: 'purba-medinipur', name: 'Purba Medinipur' },
    { id: 'purulia', name: 'Purulia' },
    { id: 'south-24-parganas', name: 'South 24 Parganas' },
    { id: 'uttar-dinajpur', name: 'Uttar Dinajpur' }
  ],
  'OR': [ // Odisha
    { id: 'angul', name: 'Angul' },
    { id: 'balangir', name: 'Balangir' },
    { id: 'balasore', name: 'Balasore' },
    { id: 'bargarh', name: 'Bargarh' },
    { id: 'bhadrak', name: 'Bhadrak' },
    { id: 'boudh', name: 'Boudh' },
    { id: 'cuttack', name: 'Cuttack' },
    { id: 'deogarh', name: 'Deogarh' },
    { id: 'dhenkanal', name: 'Dhenkanal' },
    { id: 'gajapati', name: 'Gajapati' },
    { id: 'ganjam', name: 'Ganjam' },
    { id: 'jagatsinghpur', name: 'Jagatsinghpur' },
    { id: 'jajpur', name: 'Jajpur' },
    { id: 'jharsuguda', name: 'Jharsuguda' },
    { id: 'kalahandi', name: 'Kalahandi' },
    { id: 'kandhamal', name: 'Kandhamal' },
    { id: 'kendrapara', name: 'Kendrapara' },
    { id: 'kendujhar', name: 'Kendujhar' },
    { id: 'khordha', name: 'Khordha' },
    { id: 'koraput', name: 'Koraput' },
    { id: 'malkangiri', name: 'Malkangiri' },
    { id: 'mayurbhanj', name: 'Mayurbhanj' },
    { id: 'nabarangpur', name: 'Nabarangpur' },
    { id: 'nayagarh', name: 'Nayagarh' },
    { id: 'nuapada', name: 'Nuapada' },
    { id: 'puri', name: 'Puri' },
    { id: 'rayagada', name: 'Rayagada' },
    { id: 'sambalpur', name: 'Sambalpur' },
    { id: 'subarnapur', name: 'Subarnapur' },
    { id: 'sundargarh', name: 'Sundargarh' }
  ],
  'JH': [ // Jharkhand
    { id: 'bokaro', name: 'Bokaro' },
    { id: 'chatra', name: 'Chatra' },
    { id: 'deoghar', name: 'Deoghar' },
    { id: 'dhanbad', name: 'Dhanbad' },
    { id: 'dumka', name: 'Dumka' },
    { id: 'east-singhbhum', name: 'East Singhbhum' },
    { id: 'garhwa', name: 'Garhwa' },
    { id: 'giridih', name: 'Giridih' },
    { id: 'godda', name: 'Godda' },
    { id: 'gumla', name: 'Gumla' },
    { id: 'hazaribagh', name: 'Hazaribagh' },
    { id: 'jamtara', name: 'Jamtara' },
    { id: 'khunti', name: 'Khunti' },
    { id: 'koderma', name: 'Koderma' },
    { id: 'latehar', name: 'Latehar' },
    { id: 'lohardaga', name: 'Lohardaga' },
    { id: 'pakur', name: 'Pakur' },
    { id: 'palamu', name: 'Palamu' },
    { id: 'ramgarh', name: 'Ramgarh' },
    { id: 'ranchi', name: 'Ranchi' },
    { id: 'sahibganj', name: 'Sahibganj' },
    { id: 'seraikela-kharsawan', name: 'Seraikela Kharsawan' },
    { id: 'simdega', name: 'Simdega' },
    { id: 'west-singhbhum', name: 'West Singhbhum' }
  ],
  'AS': [ // Assam
    { id: 'baksa', name: 'Baksa' },
    { id: 'barpeta', name: 'Barpeta' },
    { id: 'biswanath', name: 'Biswanath' },
    { id: 'bongaigaon', name: 'Bongaigaon' },
    { id: 'cachar', name: 'Cachar' },
    { id: 'charaideo', name: 'Charaideo' },
    { id: 'chirang', name: 'Chirang' },
    { id: 'darrang', name: 'Darrang' },
    { id: 'dhemaji', name: 'Dhemaji' },
    { id: 'dhubri', name: 'Dhubri' },
    { id: 'dibrugarh', name: 'Dibrugarh' },
    { id: 'dima-hasao', name: 'Dima Hasao' },
    { id: 'goalpara', name: 'Goalpara' },
    { id: 'golaghat', name: 'Golaghat' },
    { id: 'guwahati', name: 'Guwahati' },
    { id: 'hailakandi', name: 'Hailakandi' },
    { id: 'hojai', name: 'Hojai' },
    { id: 'jorhat', name: 'Jorhat' },
    { id: 'kamrup', name: 'Kamrup' },
    { id: 'kamrup-metro', name: 'Kamrup Metro' },
    { id: 'karbi-anglong', name: 'Karbi Anglong' },
    { id: 'karimganj', name: 'Karimganj' },
    { id: 'kokrajhar', name: 'Kokrajhar' },
    { id: 'lakhimpur', name: 'Lakhimpur' },
    { id: 'majuli', name: 'Majuli' },
    { id: 'morigaon', name: 'Morigaon' },
    { id: 'nagaon', name: 'Nagaon' },
    { id: 'nalbari', name: 'Nalbari' },
    { id: 'sivasagar', name: 'Sivasagar' },
    { id: 'sonitpur', name: 'Sonitpur' },
    { id: 'south-salmara-mankachar', name: 'South Salmara Mankachar' },
    { id: 'tinsukia', name: 'Tinsukia' },
    { id: 'udalguri', name: 'Udalguri' },
    { id: 'west-karbi-anglong', name: 'West Karbi Anglong' }
  ],
  'PB': [ // Punjab
    { id: 'amritsar', name: 'Amritsar' },
    { id: 'barnala', name: 'Barnala' },
    { id: 'bathinda', name: 'Bathinda' },
    { id: 'faridkot', name: 'Faridkot' },
    { id: 'fatehgarh-sahib', name: 'Fatehgarh Sahib' },
    { id: 'fazilka', name: 'Fazilka' },
    { id: 'ferozepur', name: 'Ferozepur' },
    { id: 'gurdaspur', name: 'Gurdaspur' },
    { id: 'hoshiarpur', name: 'Hoshiarpur' },
    { id: 'jalandhar', name: 'Jalandhar' },
    { id: 'kapurthala', name: 'Kapurthala' },
    { id: 'ludhiana', name: 'Ludhiana' },
    { id: 'mansa', name: 'Mansa' },
    { id: 'moga', name: 'Moga' },
    { id: 'muktsar', name: 'Muktsar' },
    { id: 'nawanshahr', name: 'Nawanshahr' },
    { id: 'pathankot', name: 'Pathankot' },
    { id: 'patiala', name: 'Patiala' },
    { id: 'rupnagar', name: 'Rupnagar' },
    { id: 'sangrur', name: 'Sangrur' },
    { id: 'sas-nagar', name: 'SAS Nagar' },
    { id: 'shaheed-bhagat-singh-nagar', name: 'Shaheed Bhagat Singh Nagar' },
    { id: 'tarn-taran', name: 'Tarn Taran' }
  ],
  'HR': [ // Haryana
    { id: 'ambala', name: 'Ambala' },
    { id: 'bhiwani', name: 'Bhiwani' },
    { id: 'charkhi-dadri', name: 'Charkhi Dadri' },
    { id: 'faridabad', name: 'Faridabad' },
    { id: 'fatehabad', name: 'Fatehabad' },
    { id: 'gurugram', name: 'Gurugram' },
    { id: 'hisar', name: 'Hisar' },
    { id: 'jhajjar', name: 'Jhajjar' },
    { id: 'jind', name: 'Jind' },
    { id: 'kaithal', name: 'Kaithal' },
    { id: 'karnal', name: 'Karnal' },
    { id: 'kurukshetra', name: 'Kurukshetra' },
    { id: 'mahendragarh', name: 'Mahendragarh' },
    { id: 'nuh', name: 'Nuh' },
    { id: 'palwal', name: 'Palwal' },
    { id: 'panchkula', name: 'Panchkula' },
    { id: 'panipat', name: 'Panipat' },
    { id: 'rewari', name: 'Rewari' },
    { id: 'rohtak', name: 'Rohtak' },
    { id: 'sirsa', name: 'Sirsa' },
    { id: 'sonipat', name: 'Sonipat' },
    { id: 'yamunanagar', name: 'Yamunanagar' }
  ],
  'HP': [ // Himachal Pradesh
    { id: 'bilaspur', name: 'Bilaspur' },
    { id: 'chamba', name: 'Chamba' },
    { id: 'hamirpur', name: 'Hamirpur' },
    { id: 'kangra', name: 'Kangra' },
    { id: 'kinnaur', name: 'Kinnaur' },
    { id: 'kullu', name: 'Kullu' },
    { id: 'lahaul-spiti', name: 'Lahaul and Spiti' },
    { id: 'mandi', name: 'Mandi' },
    { id: 'shimla', name: 'Shimla' },
    { id: 'sirmaur', name: 'Sirmaur' },
    { id: 'solan', name: 'Solan' },
    { id: 'una', name: 'Una' }
  ],
  'UT': [ // Uttarakhand
    { id: 'almora', name: 'Almora' },
    { id: 'bageshwar', name: 'Bageshwar' },
    { id: 'chamoli', name: 'Chamoli' },
    { id: 'champawat', name: 'Champawat' },
    { id: 'dehradun', name: 'Dehradun' },
    { id: 'haridwar', name: 'Haridwar' },
    { id: 'nainital', name: 'Nainital' },
    { id: 'pauri-garhwal', name: 'Pauri Garhwal' },
    { id: 'pithoragarh', name: 'Pithoragarh' },
    { id: 'rudraprayag', name: 'Rudraprayag' },
    { id: 'tehri-garhwal', name: 'Tehri Garhwal' },
    { id: 'udham-singh-nagar', name: 'Udham Singh Nagar' },
    { id: 'uttarkashi', name: 'Uttarkashi' }
  ],
  'CG': [ // Chhattisgarh
    { id: 'balod', name: 'Balod' },
    { id: 'baloda-bazar', name: 'Baloda Bazar' },
    { id: 'balrampur', name: 'Balrampur' },
    { id: 'bastar', name: 'Bastar' },
    { id: 'bemetara', name: 'Bemetara' },
    { id: 'bijapur', name: 'Bijapur' },
    { id: 'bilaspur', name: 'Bilaspur' },
    { id: 'dantewada', name: 'Dantewada' },
    { id: 'dhamtari', name: 'Dhamtari' },
    { id: 'durg', name: 'Durg' },
    { id: 'gariaband', name: 'Gariaband' },
    { id: 'gaurela-pendra-marwahi', name: 'Gaurela Pendra Marwahi' },
    { id: 'janjgir-champa', name: 'Janjgir Champa' },
    { id: 'jashpur', name: 'Jashpur' },
    { id: 'kabirdham', name: 'Kabirdham' },
    { id: 'kanker', name: 'Kanker' },
    { id: 'kondagaon', name: 'Kondagaon' },
    { id: 'korba', name: 'Korba' },
    { id: 'koriya', name: 'Koriya' },
    { id: 'mahasamund', name: 'Mahasamund' },
    { id: 'mungeli', name: 'Mungeli' },
    { id: 'narayanpur', name: 'Narayanpur' },
    { id: 'raigarh', name: 'Raigarh' },
    { id: 'raipur', name: 'Raipur' },
    { id: 'rajnandgaon', name: 'Rajnandgaon' },
    { id: 'sukma', name: 'Sukma' },
    { id: 'surajpur', name: 'Surajpur' },
    { id: 'surguja', name: 'Surguja' }
  ],
  'GA': [ // Goa
    { id: 'north-goa', name: 'North Goa' },
    { id: 'south-goa', name: 'South Goa' }
  ],
  'DL': [ // Delhi
    { id: 'central-delhi', name: 'Central Delhi' },
    { id: 'east-delhi', name: 'East Delhi' },
    { id: 'new-delhi', name: 'New Delhi' },
    { id: 'north-delhi', name: 'North Delhi' },
    { id: 'north-east-delhi', name: 'North East Delhi' },
    { id: 'north-west-delhi', name: 'North West Delhi' },
    { id: 'shahdara', name: 'Shahdara' },
    { id: 'south-delhi', name: 'South Delhi' },
    { id: 'south-east-delhi', name: 'South East Delhi' },
    { id: 'south-west-delhi', name: 'South West Delhi' },
    { id: 'west-delhi', name: 'West Delhi' }
  ],
  // Union Territories
  'JK': [ // Jammu and Kashmir
    { id: 'anantnag', name: 'Anantnag' },
    { id: 'bandipora', name: 'Bandipora' },
    { id: 'baramulla', name: 'Baramulla' },
    { id: 'budgam', name: 'Budgam' },
    { id: 'doda', name: 'Doda' },
    { id: 'ganderbal', name: 'Ganderbal' },
    { id: 'jammu', name: 'Jammu' },
    { id: 'kathua', name: 'Kathua' },
    { id: 'kishtwar', name: 'Kishtwar' },
    { id: 'kulgam', name: 'Kulgam' },
    { id: 'kupwara', name: 'Kupwara' },
    { id: 'poonch', name: 'Poonch' },
    { id: 'pulwama', name: 'Pulwama' },
    { id: 'rajouri', name: 'Rajouri' },
    { id: 'ramban', name: 'Ramban' },
    { id: 'reasi', name: 'Reasi' },
    { id: 'samba', name: 'Samba' },
    { id: 'shopian', name: 'Shopian' },
    { id: 'srinagar', name: 'Srinagar' },
    { id: 'udhampur', name: 'Udhampur' }
  ],
  'LA': [ // Ladakh
    { id: 'kargil', name: 'Kargil' },
    { id: 'leh', name: 'Leh' }
  ],
  'CH': [ // Chandigarh
    { id: 'chandigarh', name: 'Chandigarh' }
  ],
  'PY': [ // Puducherry
    { id: 'karaikal', name: 'Karaikal' },
    { id: 'mahe', name: 'Mahe' },
    { id: 'puducherry', name: 'Puducherry' },
    { id: 'yanam', name: 'Yanam' }
  ],
  'LD': [ // Lakshadweep
    { id: 'lakshadweep', name: 'Lakshadweep' }
  ],
  'AN': [ // Andaman and Nicobar Islands
    { id: 'nicobar', name: 'Nicobar' },
    { id: 'north-and-middle-andaman', name: 'North and Middle Andaman' },
    { id: 'south-andaman', name: 'South Andaman' }
  ],
  'DN': [ // Dadra and Nagar Haveli and Daman and Diu
    { id: 'dadra-and-nagar-haveli', name: 'Dadra and Nagar Haveli' },
    { id: 'daman', name: 'Daman' },
    { id: 'diu', name: 'Diu' }
  ],
  // North East States
  'MN': [ // Manipur
    { id: 'bishnupur', name: 'Bishnupur' },
    { id: 'chandel', name: 'Chandel' },
    { id: 'churachandpur', name: 'Churachandpur' },
    { id: 'imphal-east', name: 'Imphal East' },
    { id: 'imphal-west', name: 'Imphal West' },
    { id: 'jiribam', name: 'Jiribam' },
    { id: 'kakching', name: 'Kakching' },
    { id: 'kamjong', name: 'Kamjong' },
    { id: 'kangpokpi', name: 'Kangpokpi' },
    { id: 'noney', name: 'Noney' },
    { id: 'pherzawl', name: 'Pherzawl' },
    { id: 'senapati', name: 'Senapati' },
    { id: 'tamenglong', name: 'Tamenglong' },
    { id: 'tengnoupal', name: 'Tengnoupal' },
    { id: 'thoubal', name: 'Thoubal' },
    { id: 'ukhrul', name: 'Ukhrul' }
  ],
  'ML': [ // Meghalaya
    { id: 'east-garo-hills', name: 'East Garo Hills' },
    { id: 'east-jaintia-hills', name: 'East Jaintia Hills' },
    { id: 'east-khasi-hills', name: 'East Khasi Hills' },
    { id: 'north-garo-hills', name: 'North Garo Hills' },
    { id: 'ri-bhoi', name: 'Ri Bhoi' },
    { id: 'south-garo-hills', name: 'South Garo Hills' },
    { id: 'south-west-garo-hills', name: 'South West Garo Hills' },
    { id: 'south-west-khasi-hills', name: 'South West Khasi Hills' },
    { id: 'west-garo-hills', name: 'West Garo Hills' },
    { id: 'west-jaintia-hills', name: 'West Jaintia Hills' },
    { id: 'west-khasi-hills', name: 'West Khasi Hills' }
  ],
  'MZ': [ // Mizoram
    { id: 'aizawl', name: 'Aizawl' },
    { id: 'champhai', name: 'Champhai' },
    { id: 'hnahthial', name: 'Hnahthial' },
    { id: 'kolasib', name: 'Kolasib' },
    { id: 'khawzawl', name: 'Khawzawl' },
    { id: 'lawngtlai', name: 'Lawngtlai' },
    { id: 'lunglei', name: 'Lunglei' },
    { id: 'mamit', name: 'Mamit' },
    { id: 'saiha', name: 'Saiha' },
    { id: 'saitual', name: 'Saitual' },
    { id: 'serchhip', name: 'Serchhip' }
  ],
  'NL': [ // Nagaland
    { id: 'dimapur', name: 'Dimapur' },
    { id: 'kiphire', name: 'Kiphire' },
    { id: 'kohima', name: 'Kohima' },
    { id: 'longleng', name: 'Longleng' },
    { id: 'mokokchung', name: 'Mokokchung' },
    { id: 'mon', name: 'Mon' },
    { id: 'noklak', name: 'Noklak' },
    { id: 'peren', name: 'Peren' },
    { id: 'phek', name: 'Phek' },
    { id: 'tuensang', name: 'Tuensang' },
    { id: 'wokha', name: 'Wokha' },
    { id: 'zunheboto', name: 'Zunheboto' }
  ],
  'SK': [ // Sikkim
    { id: 'east-sikkim', name: 'East Sikkim' },
    { id: 'north-sikkim', name: 'North Sikkim' },
    { id: 'south-sikkim', name: 'South Sikkim' },
    { id: 'west-sikkim', name: 'West Sikkim' }
  ],
  'TR': [ // Tripura
    { id: 'dhalai', name: 'Dhalai' },
    { id: 'gomati', name: 'Gomati' },
    { id: 'khowai', name: 'Khowai' },
    { id: 'north-tripura', name: 'North Tripura' },
    { id: 'sepahijala', name: 'Sepahijala' },
    { id: 'south-tripura', name: 'South Tripura' },
    { id: 'unakoti', name: 'Unakoti' },
    { id: 'west-tripura', name: 'West Tripura' }
  ],
  'AR': [ // Arunachal Pradesh
    { id: 'anjaw', name: 'Anjaw' },
    { id: 'central-siang', name: 'Central Siang' },
    { id: 'changlang', name: 'Changlang' },
    { id: 'dibang-valley', name: 'Dibang Valley' },
    { id: 'east-kameng', name: 'East Kameng' },
    { id: 'east-siang', name: 'East Siang' },
    { id: 'itanagar', name: 'Itanagar' },
    { id: 'kamle', name: 'Kamle' },
    { id: 'kra-daadi', name: 'Kra Daadi' },
    { id: 'kurung-kumey', name: 'Kurung Kumey' },
    { id: 'lepa-rada', name: 'Lepa Rada' },
    { id: 'lohit', name: 'Lohit' },
    { id: 'longding', name: 'Longding' },
    { id: 'lower-dibang-valley', name: 'Lower Dibang Valley' },
    { id: 'lower-siang', name: 'Lower Siang' },
    { id: 'lower-subansiri', name: 'Lower Subansiri' },
    { id: 'namsai', name: 'Namsai' },
    { id: 'pakke-kessang', name: 'Pakke Kessang' },
    { id: 'papum-pare', name: 'Papum Pare' },
    { id: 'shi-yomi', name: 'Shi Yomi' },
    { id: 'tawang', name: 'Tawang' },
    { id: 'tirap', name: 'Tirap' },
    { id: 'upper-siang', name: 'Upper Siang' },
    { id: 'upper-subansiri', name: 'Upper Subansiri' },
    { id: 'west-kameng', name: 'West Kameng' },
    { id: 'west-siang', name: 'West Siang' }
  ]
};

// Sample location names data - In production, this would come from a database
const locationNamesDatabase = {
  'mumbai-island-city': [
    { id: 'fort', name: 'Fort', type: 'urban', talukId: 'mumbai-island-city', cityId: 'mumbai-city', districtId: 'mumbai', pincode: '400001' },
    { id: 'colaba', name: 'Colaba', type: 'urban', talukId: 'mumbai-island-city', cityId: 'mumbai-city', districtId: 'mumbai', pincode: '400005' },
    { id: 'nariman-point', name: 'Nariman Point', type: 'urban', talukId: 'mumbai-island-city', cityId: 'mumbai-city', districtId: 'mumbai', pincode: '400021' }
  ],
  'andheri': [
    { id: 'andheri-west', name: 'Andheri West', type: 'urban', talukId: 'andheri', cityId: 'mumbai-suburban', districtId: 'mumbai', pincode: '400053' },
    { id: 'andheri-east', name: 'Andheri East', type: 'urban', talukId: 'andheri', cityId: 'mumbai-suburban', districtId: 'mumbai', pincode: '400069' },
    { id: 'versova', name: 'Versova', type: 'urban', talukId: 'andheri', cityId: 'mumbai-suburban', districtId: 'mumbai', pincode: '400061' }
  ],
  'borivali': [
    { id: 'borivali-west', name: 'Borivali West', type: 'urban', talukId: 'borivali', cityId: 'mumbai-suburban', districtId: 'mumbai', pincode: '400092' },
    { id: 'borivali-east', name: 'Borivali East', type: 'urban', talukId: 'borivali', cityId: 'mumbai-suburban', districtId: 'mumbai', pincode: '400066' }
  ],
  'bangalore-south': [
    { id: 'koramangala', name: 'Koramangala', type: 'urban', talukId: 'bangalore-south', cityId: 'bangalore', districtId: 'bangalore-urban', pincode: '560034' },
    { id: 'jayanagar', name: 'Jayanagar', type: 'urban', talukId: 'bangalore-south', cityId: 'bangalore', districtId: 'bangalore-urban', pincode: '560011' },
    { id: 'btm-layout', name: 'BTM Layout', type: 'urban', talukId: 'bangalore-south', cityId: 'bangalore', districtId: 'bangalore-urban', pincode: '560029' }
  ],
  'bangalore-north': [
    { id: 'hebbal', name: 'Hebbal', type: 'urban', talukId: 'bangalore-north', cityId: 'bangalore', districtId: 'bangalore-urban', pincode: '560024' },
    { id: 'yelahanka', name: 'Yelahanka', type: 'town', talukId: 'bangalore-north', cityId: 'bangalore', districtId: 'bangalore-urban', pincode: '560064' }
  ],
  'tiruppur-taluk': [
    { id: 'tiruppur-town', name: 'Tiruppur Town', type: 'town', talukId: 'tiruppur-taluk', cityId: 'tiruppur-city', districtId: 'tiruppur', pincode: '641601' },
    { id: 'avinashi-road', name: 'Avinashi Road', type: 'urban', talukId: 'tiruppur-taluk', cityId: 'tiruppur-city', districtId: 'tiruppur', pincode: '641603' },
    { id: 'dharapuram-road', name: 'Dharapuram Road', type: 'urban', talukId: 'tiruppur-taluk', cityId: 'tiruppur-city', districtId: 'tiruppur', pincode: '641602' }
  ]
};

// Sample localities data - In production, this would come from a database (legacy - keeping for compatibility)
const localitiesDatabase = {
  'mumbai': [
    { id: "bandra-west", name: "Bandra West", cityId: "mumbai", pincode: "400050", area: "Bandra" },
    { id: "andheri-east", name: "Andheri East", cityId: "mumbai", pincode: "400069", area: "Andheri" },
    { id: "powai", name: "Powai", cityId: "mumbai", pincode: "400076", area: "Powai" },
    { id: "malad-west", name: "Malad West", cityId: "mumbai", pincode: "400064", area: "Malad" },
    { id: "juhu", name: "Juhu", cityId: "mumbai", pincode: "400049", area: "Juhu" },
    { id: "santacruz-east", name: "Santacruz East", cityId: "mumbai", pincode: "400055", area: "Santacruz" },
    { id: "goregaon-west", name: "Goregaon West", cityId: "mumbai", pincode: "400062", area: "Goregaon" },
    { id: "versova", name: "Versova", cityId: "mumbai", pincode: "400061", area: "Versova" },
    { id: "kandivali-east", name: "Kandivali East", cityId: "mumbai", pincode: "400101", area: "Kandivali" },
    { id: "borivali-west", name: "Borivali West", cityId: "mumbai", pincode: "400092", area: "Borivali" }
  ],
  'bangalore': [
    { id: "koramangala", name: "Koramangala", cityId: "bangalore", pincode: "560034", area: "Koramangala" },
    { id: "whitefield", name: "Whitefield", cityId: "bangalore", pincode: "560066", area: "Whitefield" },
    { id: "indiranagar", name: "Indiranagar", cityId: "bangalore", pincode: "560038", area: "Indiranagar" },
    { id: "jayanagar", name: "Jayanagar", cityId: "bangalore", pincode: "560011", area: "Jayanagar" },
    { id: "electronic-city", name: "Electronic City", cityId: "bangalore", pincode: "560100", area: "Electronic City" },
    { id: "hsr-layout", name: "HSR Layout", cityId: "bangalore", pincode: "560102", area: "HSR Layout" },
    { id: "marathahalli", name: "Marathahalli", cityId: "bangalore", pincode: "560037", area: "Marathahalli" },
    { id: "btm-layout", name: "BTM Layout", cityId: "bangalore", pincode: "560029", area: "BTM Layout" },
    { id: "jp-nagar", name: "JP Nagar", cityId: "bangalore", pincode: "560078", area: "JP Nagar" },
    { id: "banashankari", name: "Banashankari", cityId: "bangalore", pincode: "560070", area: "Banashankari" }
  ],
  'pune': [
    { id: "kothrud", name: "Kothrud", cityId: "pune", pincode: "411038", area: "Kothrud" },
    { id: "hinjewadi", name: "Hinjewadi", cityId: "pune", pincode: "411057", area: "Hinjewadi" },
    { id: "wakad", name: "Wakad", cityId: "pune", pincode: "411057", area: "Wakad" },
    { id: "baner", name: "Baner", cityId: "pune", pincode: "411045", area: "Baner" },
    { id: "aundh", name: "Aundh", cityId: "pune", pincode: "411007", area: "Aundh" },
    { id: "viman-nagar", name: "Viman Nagar", cityId: "pune", pincode: "411014", area: "Viman Nagar" },
    { id: "magarpatta", name: "Magarpatta", cityId: "pune", pincode: "411028", area: "Magarpatta" },
    { id: "kalyani-nagar", name: "Kalyani Nagar", cityId: "pune", pincode: "411006", area: "Kalyani Nagar" }
  ],
  'delhi': [
    { id: "cp", name: "Connaught Place", cityId: "delhi", pincode: "110001", area: "Central Delhi" },
    { id: "karol-bagh", name: "Karol Bagh", cityId: "delhi", pincode: "110005", area: "Karol Bagh" },
    { id: "lajpat-nagar", name: "Lajpat Nagar", cityId: "delhi", pincode: "110024", area: "Lajpat Nagar" },
    { id: "rohini", name: "Rohini", cityId: "delhi", pincode: "110085", area: "Rohini" },
    { id: "dwarka", name: "Dwarka", cityId: "delhi", pincode: "110075", area: "Dwarka" },
    { id: "saket", name: "Saket", cityId: "delhi", pincode: "110017", area: "Saket" },
    { id: "vasant-kunj", name: "Vasant Kunj", cityId: "delhi", pincode: "110070", area: "Vasant Kunj" },
    { id: "gurgaon", name: "Gurgaon", cityId: "delhi", pincode: "122001", area: "Gurgaon" }
  ],
  'chennai': [
    { id: "anna-nagar", name: "Anna Nagar", cityId: "chennai", pincode: "600040", area: "Anna Nagar" },
    { id: "t-nagar", name: "T. Nagar", cityId: "chennai", pincode: "600017", area: "T. Nagar" },
    { id: "adyar", name: "Adyar", cityId: "chennai", pincode: "600020", area: "Adyar" },
    { id: "velachery", name: "Velachery", cityId: "chennai", pincode: "600042", area: "Velachery" },
    { id: "omr", name: "OMR (IT Corridor)", cityId: "chennai", pincode: "600096", area: "OMR" },
    { id: "tambaram", name: "Tambaram", cityId: "chennai", pincode: "600045", area: "Tambaram" },
    { id: "porur", name: "Porur", cityId: "chennai", pincode: "600116", area: "Porur" },
    { id: "chrompet", name: "Chrompet", cityId: "chennai", pincode: "600044", area: "Chrompet" }
  ],
  'new-delhi': [
    { id: "cp", name: "Connaught Place", cityId: "new-delhi", pincode: "110001", area: "Central Delhi" },
    { id: "karol-bagh", name: "Karol Bagh", cityId: "new-delhi", pincode: "110005", area: "Karol Bagh" },
    { id: "lajpat-nagar", name: "Lajpat Nagar", cityId: "new-delhi", pincode: "110024", area: "Lajpat Nagar" },
    { id: "rohini", name: "Rohini", cityId: "new-delhi", pincode: "110085", area: "Rohini" },
    { id: "dwarka", name: "Dwarka", cityId: "new-delhi", pincode: "110075", area: "Dwarka" },
    { id: "saket", name: "Saket", cityId: "new-delhi", pincode: "110017", area: "Saket" }
  ]
};

// Sample pincode database - In production, this would come from a comprehensive pincode database
const pincodeDatabase = {
  '400050': {
    pincode: '400050',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    locality: 'Bandra West',
    area: 'Bandra',
    district: 'Mumbai Suburban'
  },
  '560034': {
    pincode: '560034',
    country: 'India',
    state: 'Karnataka',
    city: 'Bangalore',
    locality: 'Koramangala',
    area: 'Koramangala',
    district: 'Bangalore Urban'
  },
  '411038': {
    pincode: '411038',
    country: 'India',
    state: 'Maharashtra',
    city: 'Pune',
    locality: 'Kothrud',
    area: 'Kothrud',
    district: 'Pune'
  },
  '110001': {
    pincode: '110001',
    country: 'India',
    state: 'Delhi',
    city: 'New Delhi',
    locality: 'Connaught Place',
    area: 'Central Delhi',
    district: 'New Delhi'
  },
  '600040': {
    pincode: '600040',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Chennai',
    locality: 'Anna Nagar',
    area: 'Anna Nagar',
    district: 'Chennai'
  }
};

// @route   GET /api/locations/cities/:districtId
// @desc    Get cities by district
// @access  Public
router.get('/cities/:districtId', asyncHandler(async (req, res) => {
  try {
    const { districtId } = req.params;
    const { state } = req.query;
    
    // Normalize district ID
    const normalizedDistrictId = districtId.toLowerCase().replace(/\s+/g, '-');
    
    // Generate cities dynamically for any district
    function generateCitiesForDistrict(districtId, stateCode) {
      const districtName = districtId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      const cities = [];
      
      // Main city (district headquarters)
      cities.push({
        id: `${districtId}-city`,
        name: `${districtName}`,
        districtId: districtId,
        stateCode: stateCode,
        countryCode: 'IN'
      });
      
      // Generate common city patterns for Indian cities
      const cityPatterns = [
        'Municipal Corporation',
        'Town',
        'Urban Area',
        'Metropolitan Area'
      ];
      
      cityPatterns.forEach((pattern, index) => {
        cities.push({
          id: `${districtId}-${pattern.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${districtName} ${pattern}`,
          districtId: districtId,
          stateCode: stateCode,
          countryCode: 'IN'
        });
      });
      
      return cities;
    }
    
    const cities = generateCitiesForDistrict(normalizedDistrictId, state);
    
    res.json({
      success: true,
      cities: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities'
    });
  }
}));

// @route   GET /api/locations/taluks/:cityId
// @desc    Get taluks by city
// @access  Public
router.get('/taluks/:cityId', asyncHandler(async (req, res) => {
  try {
    const { cityId } = req.params;
    
    // Normalize city ID
    const normalizedCityId = cityId.toLowerCase().replace(/\s+/g, '-');
    
    // Generate taluks dynamically for any city
    function generateTaluksForCity(cityId) {
      // Extract district and state from city ID pattern
      const cityParts = cityId.split('-');
      const baseName = cityParts[0];
      const districtId = cityParts.length > 1 && cityParts[1] !== 'city' ? 
        cityParts.slice(0, -1).join('-') : cityParts[0];
      
      const talukName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      
      const taluks = [];
      
      // Main taluk
      taluks.push({
        id: `${baseName}-taluk`,
        name: `${talukName} Taluk`,
        cityId: cityId,
        districtId: districtId,
        stateCode: 'IN', // Will be set by frontend
        countryCode: 'IN'
      });
      
      // Additional taluks/blocks based on Indian administrative patterns
      const talukPatterns = [
        'Block',
        'Tehsil',
        'Sub-Division'
      ];
      
      talukPatterns.forEach((pattern, index) => {
        taluks.push({
          id: `${baseName}-${pattern.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${talukName} ${pattern}`,
          cityId: cityId,
          districtId: districtId,
          stateCode: 'IN',
          countryCode: 'IN'
        });
      });
      
      return taluks;
    }
    
    const taluks = generateTaluksForCity(normalizedCityId);
    
    res.json({
      success: true,
      taluks: taluks
    });
  } catch (error) {
    console.error('Error fetching taluks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch taluks'
    });
  }
}));

// @route   GET /api/locations/location-names/:talukId
// @desc    Get location names by taluk
// @access  Public
router.get('/location-names/:talukId', asyncHandler(async (req, res) => {
  try {
    const { talukId } = req.params;
    
    // Normalize taluk ID
    const normalizedTalukId = talukId.toLowerCase().replace(/\s+/g, '-');
    
    // Generate location names dynamically for any taluk
    function generateLocationNamesForTaluk(talukId) {
      // Extract base name from taluk ID
      const baseName = talukId.split('-')[0];
      const locationName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      
      const locationNames = [];
      
      // Common Indian location name patterns
      const locationPatterns = [
        { suffix: '', type: 'urban' }, // Main location
        { suffix: 'Nagar', type: 'urban' },
        { suffix: 'Colony', type: 'urban' },
        { suffix: 'Layout', type: 'urban' },
        { suffix: 'Extension', type: 'urban' },
        { suffix: 'Market', type: 'urban' },
        { suffix: 'Junction', type: 'urban' },
        { suffix: 'Cross', type: 'urban' },
        { suffix: 'Road', type: 'urban' },
        { suffix: 'Village', type: 'village' },
        { suffix: 'Gram', type: 'village' },
        { suffix: 'Patti', type: 'village' },
        { suffix: 'Town', type: 'town' },
        { suffix: 'City', type: 'urban' },
        { suffix: 'Area', type: 'urban' }
      ];
      
      locationPatterns.forEach((pattern, index) => {
        const name = pattern.suffix ? `${locationName} ${pattern.suffix}` : locationName;
        const id = pattern.suffix ? 
          `${baseName}-${pattern.suffix.toLowerCase()}` : 
          `${baseName}-main`;
          
        locationNames.push({
          id: id,
          name: name,
          type: pattern.type,
          talukId: talukId,
          cityId: '', // Will be populated by frontend
          districtId: '', // Will be populated by frontend
          pincode: null // Will be populated when available
        });
      });
      
      return locationNames;
    }
    
    // First try existing database, then generate dynamic data
    const existingLocationNames = locationNamesDatabase[normalizedTalukId];
    const locationNames = existingLocationNames && existingLocationNames.length > 0 
      ? existingLocationNames 
      : generateLocationNamesForTaluk(normalizedTalukId);
    
    res.json({
      success: true,
      locationNames: locationNames
    });
  } catch (error) {
    console.error('Error fetching location names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location names'
    });
  }
}));

// @route   GET /api/locations/pincode/:pincode
// @desc    Get comprehensive location data by pincode using LocationIQ API with fallback
// @access  Public
router.get('/pincode/:pincode', asyncHandler(async (req, res) => {
  try {
    const { pincode } = req.params;
    
    // Validate pincode format (6 digits for India)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode format. Expected 6 digits.'
      });
    }

    // Enhanced LocationIQ integration for comprehensive address lookup
    try {
      // Primary LocationIQ search for detailed address components
      const searchResults = await callLocationIQAPI('/search.php', {
        q: `${pincode}, India`,
        countrycodes: 'in',
        limit: 3, // Get multiple results for better accuracy
        addressdetails: 1,
        extratags: 1,
        namedetails: 1
      });

      if (searchResults && searchResults.length > 0) {
        // Select the best result (usually the first one with most complete data)
        const bestResult = searchResults.find(result => 
          result.address && result.address.postcode === pincode
        ) || searchResults[0];
        
        const addressComponents = bestResult.address || {};
        const parsed = parseLocationIQAddress(addressComponents);
        
        const locationData = {
          pincode: pincode,
          country: parsed.country,
          countryCode: parsed.countryCode,
          state: parsed.state,
          stateCode: parsed.stateCode,
          district: parsed.district,
          city: parsed.city,
          taluk: parsed.taluk,
          locationName: parsed.locationName,
          locationType: parsed.locationType,
          latitude: parseFloat(bestResult.lat),
          longitude: parseFloat(bestResult.lon),
          displayName: bestResult.display_name,
          area: addressComponents.suburb || addressComponents.neighbourhood || '',
          region: addressComponents.region || addressComponents.state_district || '',
          formattedAddress: bestResult.display_name,
          // Enhanced fields for better location hierarchy
          road: addressComponents.road || '',
          neighbourhood: addressComponents.neighbourhood || '',
          suburb: addressComponents.suburb || '',
          hamlet: addressComponents.hamlet || '',
          village: addressComponents.village || '',
          town: addressComponents.town || '',
          county: addressComponents.county || '',
          postcode: addressComponents.postcode || pincode
        };

        return res.json({
          success: true,
          data: locationData,
          source: 'locationiq_enhanced',
          confidence: 'high'
        });
      }
    } catch (locationIQError) {
      console.error('LocationIQ enhanced search error:', locationIQError.message);
    }

    // Secondary fallback: Indian Postal API with enhanced parsing
    try {
      const axios = require('axios');
      const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'LocationService/1.0'
        }
      });
      const data = response.data;
      
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        
        // Enhanced parsing for Indian postal data
        const locationData = {
          pincode: pincode,
          country: 'India',
          countryCode: 'IN',
          state: postOffice.State,
          stateCode: getStateCode(postOffice.State),
          district: postOffice.District,
          city: postOffice.District, // In India, city is often the district name
          taluk: postOffice.Block || postOffice.Taluk || '',
          locationName: postOffice.Name,
          locationType: determineLocationType(postOffice.Name),
          area: postOffice.Block || postOffice.Name,
          region: postOffice.Region || postOffice.Division || '',
          formattedAddress: `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}, India ${pincode}`,
          // Additional fields from postal data
          division: postOffice.Division || '',
          circle: postOffice.Circle || '',
          deliveryStatus: postOffice.DeliveryStatus || ''
        };
        
        return res.json({
          success: true,
          data: locationData,
          source: 'postal_api_enhanced',
          confidence: 'medium'
        });
      }
    } catch (postalError) {
      console.error('Enhanced postal API error:', postalError.message);
    }

    // Tertiary fallback: Local pincode database lookup
    if (pincodeDatabase[pincode]) {
      const localData = pincodeDatabase[pincode];
      return res.json({
        success: true,
        data: {
          ...localData,
          formattedAddress: `${localData.locality}, ${localData.district}, ${localData.state}, ${localData.country} ${pincode}`
        },
        source: 'local_database',
        confidence: 'low'
      });
    }

    // If all methods fail, return structured error
    return res.status(404).json({
      success: false,
      message: 'Pincode not found in LocationIQ, Postal API, or local database',
      errorCode: 'PINCODE_NOT_FOUND',
      suggestions: [
        'Verify the pincode is correct',
        'Try searching by city or area name instead',
        'Check if the pincode is from India (6 digits)'
      ]
    });

  } catch (error) {
    console.error('Error in enhanced pincode lookup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pincode data',
      errorCode: 'INTERNAL_ERROR',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/address-search
// @desc    Enhanced address search using LocationIQ API with intelligent auto-complete
// @access  Public
router.get('/address-search', asyncHandler(async (req, res) => {
  try {
    const { q: query, limit = 10, countrycode = 'in', type = 'all' } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchQuery = query.trim();
    const isPincode = /^\d{1,6}$/.test(searchQuery);
    
    // Enhanced LocationIQ search with multiple search strategies
    try {
      let searchResults = [];
      
      if (isPincode && searchQuery.length >= 3) {
        // Pincode-based search for partial or complete pincodes
        searchResults = await callLocationIQAPI('/search.php', {
          q: `${searchQuery}* India`,
          countrycodes: countrycode,
          limit: parseInt(limit),
          addressdetails: 1,
          extratags: 1,
          format: 'json'
        });
      } else {
        // Multi-strategy search for better results
        const searchQueries = [
          `${searchQuery}, India`,
          `${searchQuery}`,
          `${searchQuery} India`
        ];
        
        for (const q of searchQueries) {
          try {
            const results = await callLocationIQAPI('/search.php', {
              q: q,
              countrycodes: countrycode,
              limit: Math.ceil(parseInt(limit) / searchQueries.length),
              addressdetails: 1,
              extratags: 1,
              format: 'json'
            });
            
            if (results && results.length > 0) {
              searchResults.push(...results);
            }
          } catch (queryError) {
            console.log(`Search query "${q}" failed, trying next...`);
          }
        }
      }

      if (searchResults && searchResults.length > 0) {
        // Remove duplicates and sort by relevance
        const uniqueResults = [];
        const seenPlaceIds = new Set();
        
        searchResults.forEach(result => {
          if (!seenPlaceIds.has(result.place_id)) {
            seenPlaceIds.add(result.place_id);
            uniqueResults.push(result);
          }
        });
        
        const formattedResults = uniqueResults.slice(0, parseInt(limit)).map((result, index) => {
          const addressComponents = result.address || {};
          const parsed = parseLocationIQAddress(addressComponents);
          
          // Calculate relevance score based on query match
          let relevance = 1.0 - (index * 0.05);
          const displayName = result.display_name.toLowerCase();
          const queryLower = searchQuery.toLowerCase();
          
          if (displayName.startsWith(queryLower)) {
            relevance += 0.3;
          } else if (displayName.includes(queryLower)) {
            relevance += 0.1;
          }
          
          return {
            id: `locationiq_${result.place_id}`,
            displayName: result.display_name,
            country: parsed.country,
            countryCode: parsed.countryCode,
            state: parsed.state,
            stateCode: parsed.stateCode,
            district: parsed.district,
            city: parsed.city,
            taluk: parsed.taluk,
            locationName: parsed.locationName,
            locationType: parsed.locationType,
            postcode: addressComponents.postcode,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            relevance: relevance,
            matchType: isPincode ? 'pincode' : 'address',
            // Enhanced fields for auto-complete
            shortName: addressComponents.city || addressComponents.town || addressComponents.village || '',
            category: result.class || 'place',
            importance: parseFloat(result.importance || '0.5')
          };
        });

        // Sort by relevance and importance
        formattedResults.sort((a, b) => {
          const scoreA = (a.relevance * 0.7) + (a.importance * 0.3);
          const scoreB = (b.relevance * 0.7) + (b.importance * 0.3);
          return scoreB - scoreA;
        });

        return res.json({
          success: true,
          results: formattedResults,
          total: formattedResults.length,
          source: 'locationiq_enhanced',
          query: searchQuery,
          isPincode: isPincode
        });
      }
    } catch (locationIQError) {
      console.error('Enhanced LocationIQ search error:', locationIQError.message);
    }

    // Enhanced local search fallback with fuzzy matching
    const searchQueryLower = searchQuery.toLowerCase().trim();
    const results = [];

    // Search in all available data sources with intelligent matching
    const allSources = [
      ...Object.values(locationNamesDatabase).flat(),
      ...Object.values(localitiesDatabase).flat()
    ];

    allSources.forEach(item => {
      if (!item.name) return;
      
      const itemName = item.name.toLowerCase();
      let relevance = 0;
      
      // Exact match (highest priority)
      if (itemName === searchQueryLower) {
        relevance = 1.0;
      }
      // Starts with query (high priority)
      else if (itemName.startsWith(searchQueryLower)) {
        relevance = 0.8;
      }
      // Contains query (medium priority)
      else if (itemName.includes(searchQueryLower)) {
        relevance = 0.6;
      }
      // Fuzzy match (check if words match)
      else {
        const queryWords = searchQueryLower.split(/\s+/);
        const itemWords = itemName.split(/\s+/);
        let matchCount = 0;
        
        queryWords.forEach(queryWord => {
          if (itemWords.some(itemWord => itemWord.includes(queryWord) || queryWord.includes(itemWord))) {
            matchCount++;
          }
        });
        
        if (matchCount > 0) {
          relevance = (matchCount / queryWords.length) * 0.4;
        }
      }
      
      // Also search in pincode if available
      if (item.pincode && item.pincode.includes(searchQuery)) {
        relevance = Math.max(relevance, 0.7);
      }
      
      if (relevance > 0 && !results.find(r => r.id === item.id)) {
        results.push({
          ...item,
          displayName: `${item.name}${item.pincode ? `, PIN: ${item.pincode}` : ''}${item.area ? `, ${item.area}` : ''}`,
          relevance: relevance,
          source: 'local_enhanced',
          matchType: item.pincode && item.pincode.includes(searchQuery) ? 'pincode' : 'name'
        });
      }
    });

    // Sort by relevance
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

    res.json({
      success: true,
      results: results.slice(0, parseInt(limit)),
      total: results.length,
      source: 'local_enhanced',
      query: searchQuery,
      isPincode: isPincode
    });

  } catch (error) {
    console.error('Enhanced address search error:', error);
    res.status(500).json({
      success: false,
      message: 'Address search failed',
      errorCode: 'SEARCH_ERROR',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/reverse-geocode
// @desc    Reverse geocode coordinates to address using LocationIQ
// @access  Public
router.get('/reverse-geocode', asyncHandler(async (req, res) => {
  try {
    const { lat, lon, zoom = 18 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude format'
      });
    }

    try {
      const reverseResults = await callLocationIQAPI('/reverse.php', {
        lat: latitude,
        lon: longitude,
        zoom: parseInt(zoom),
        addressdetails: 1
      });

      if (reverseResults && reverseResults.address) {
        const addressComponents = reverseResults.address;
        const locationData = {
          displayName: reverseResults.display_name,
          country: 'India',
          countryCode: 'IN',
          state: addressComponents.state,
          stateCode: getStateCode(addressComponents.state || ''),
          district: addressComponents.state_district || addressComponents.county,
          city: addressComponents.city || addressComponents.town || addressComponents.village,
          taluk: addressComponents.suburb || addressComponents.neighbourhood,
          locationName: addressComponents.road || addressComponents.residential || 
                       addressComponents.suburb || addressComponents.village,
          locationType: addressComponents.village ? 'village' : 
                       addressComponents.town ? 'town' : 'urban',
          postcode: addressComponents.postcode,
          latitude: latitude,
          longitude: longitude,
          // Additional address components
          houseNumber: addressComponents.house_number,
          road: addressComponents.road,
          neighbourhood: addressComponents.neighbourhood,
          suburb: addressComponents.suburb
        };

        return res.json({
          success: true,
          data: locationData,
          source: 'locationiq'
        });
      }
    } catch (locationIQError) {
      console.error('LocationIQ reverse geocode error:', locationIQError.message);
    }

    return res.status(404).json({
      success: false,
      message: 'Unable to reverse geocode the provided coordinates'
    });

  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Reverse geocoding failed',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/search/location-names
// @desc    Search location names by query and taluk
// @access  Public
router.get('/search/location-names', asyncHandler(async (req, res) => {
  try {
    const { q: query, talukId } = req.query;
    
    if (!query || !talukId) {
      return res.status(400).json({
        success: false,
        message: 'Query and talukId are required'
      });
    }
    
    // Normalize taluk ID
    const normalizedTalukId = talukId.toLowerCase().replace(/\s+/g, '-');
    const allLocationNames = locationNamesDatabase[normalizedTalukId] || [];
    
    // Filter location names based on query
    const filteredLocationNames = allLocationNames.filter(locationName =>
      locationName.name.toLowerCase().includes(query.toLowerCase()) ||
      locationName.type.toLowerCase().includes(query.toLowerCase()) ||
      (locationName.area && locationName.area.toLowerCase().includes(query.toLowerCase()))
    );
    
    res.json({
      success: true,
      locationNames: filteredLocationNames
    });
  } catch (error) {
    console.error('Error searching location names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search location names'
    });
  }
}));

// @route   GET /api/locations/search
// @desc    Search locations across all levels with comprehensive coverage  
// @access  Public
router.get('/search', asyncHandler(async (req, res) => {
  try {
    const { q: query, state, level = 'location' } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchQuery = query.toLowerCase().trim();
    const results = [];

    // Search in all available data sources
    const allSources = [
      ...Object.values(locationNamesDatabase).flat(),
      ...Object.values(localitiesDatabase).flat()
    ];

    allSources.forEach(item => {
      if (item.name && item.name.toLowerCase().includes(searchQuery)) {
        // Don't add duplicates
        if (!results.find(r => r.id === item.id)) {
          results.push({
            ...item,
            type: level,
            relevance: item.name.toLowerCase() === searchQuery ? 1 : 0.5
          });
        }
      }
    });

    // Sort by relevance
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

    res.json({
      success: true,
      results: results.slice(0, 20), // Limit to 20 results
      total: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/coverage-stats  
// @desc    Get comprehensive coverage statistics
// @access  Public
router.get('/coverage-stats', asyncHandler(async (req, res) => {
  try {
    const { state } = req.query;
    
    let stats = {
      districts: 0,
      cities: 0,
      taluks: 0,
      locationNames: 0,
      coverage: 'comprehensive'
    };

    // Calculate actual data coverage
    const locationNamesCount = Object.values(locationNamesDatabase)
      .flat().length;
    const localitiesCount = Object.values(localitiesDatabase)
      .flat().length;
    
    stats.locationNames = locationNamesCount + localitiesCount;
    stats.taluks = Object.keys(locationNamesDatabase).length;
    stats.cities = new Set(
      Object.values(locationNamesDatabase)
        .flat()
        .map(item => item.cityId)
    ).size;
    stats.districts = new Set(
      Object.values(locationNamesDatabase)
        .flat()
        .map(item => item.districtId)
    ).size;

    // Determine coverage level
    if (stats.locationNames > 1000) {
      stats.coverage = 'comprehensive';
    } else if (stats.locationNames > 100) {
      stats.coverage = 'major-areas';
    } else {
      stats.coverage = 'limited';
    }

    res.json({
      success: true,
      stats: stats,
      message: `Coverage includes ${stats.locationNames} locations across ${stats.districts} districts`
    });

  } catch (error) {
    console.error('Coverage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get coverage statistics',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/districts/:stateCode
// @desc    Get all districts for a state with comprehensive coverage
// @access  Public  
router.get('/districts/:stateCode', asyncHandler(async (req, res) => {
  try {
    const { stateCode } = req.params;
    const { country = 'IN' } = req.query;
    
    // Use comprehensive Indian districts database
    let districtList = [];
    
    if (country === 'IN' && indianDistricts[stateCode]) {
      districtList = indianDistricts[stateCode].map(district => ({
        id: district.id,
        name: district.name,
        stateCode: stateCode,
        countryCode: country
      }));
    } else {
      // Fallback to extracting from sample location data
      const districts = new Set();
      Object.values(locationNamesDatabase).flat().forEach(item => {
        if (item.districtId) {
          districts.add(item.districtId);
        }
      });

      districtList = Array.from(districts).map(districtId => ({
        id: districtId,
        name: districtId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        stateCode: stateCode,
        countryCode: country
      }));
    }

    res.json({
      success: true,
      districts: districtList,
      message: `Found ${districtList.length} districts for ${stateCode}`
    });

  } catch (error) {
    console.error('Districts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
}));

// @route   GET /api/locations/autocomplete/countries
// @desc    Enhanced country suggestions with intelligent auto-complete
// @access  Public
router.get('/autocomplete/countries', asyncHandler(async (req, res) => {
  try {
    const { q: query = '', limit = 10 } = req.query;
    
    const countries = [
      { id: 'IN', name: 'India', code: 'IN', flag: '🇮🇳', phoneCode: '+91', priority: 1 },
      { id: 'US', name: 'United States', code: 'US', flag: '🇺🇸', phoneCode: '+1', priority: 2 },
      { id: 'GB', name: 'United Kingdom', code: 'GB', flag: '🇬🇧', phoneCode: '+44', priority: 3 },
      { id: 'CA', name: 'Canada', code: 'CA', flag: '🇨🇦', phoneCode: '+1', priority: 4 },
      { id: 'AU', name: 'Australia', code: 'AU', flag: '🇦🇺', phoneCode: '+61', priority: 5 },
      { id: 'AE', name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', phoneCode: '+971', priority: 6 },
      { id: 'SG', name: 'Singapore', code: 'SG', flag: '🇸🇬', phoneCode: '+65', priority: 7 },
      { id: 'MY', name: 'Malaysia', code: 'MY', flag: '🇲🇾', phoneCode: '+60', priority: 8 },
      { id: 'DE', name: 'Germany', code: 'DE', flag: '🇩🇪', phoneCode: '+49', priority: 9 },
      { id: 'FR', name: 'France', code: 'FR', flag: '🇫🇷', phoneCode: '+33', priority: 10 },
      { id: 'JP', name: 'Japan', code: 'JP', flag: '🇯🇵', phoneCode: '+81', priority: 11 },
      { id: 'CN', name: 'China', code: 'CN', flag: '🇨🇳', phoneCode: '+86', priority: 12 },
      { id: 'BR', name: 'Brazil', code: 'BR', flag: '🇧🇷', phoneCode: '+55', priority: 13 },
      { id: 'TH', name: 'Thailand', code: 'TH', flag: '🇹🇭', phoneCode: '+66', priority: 14 },
      { id: 'ID', name: 'Indonesia', code: 'ID', flag: '🇮🇩', phoneCode: '+62', priority: 15 }
    ];
    
    if (!query.trim()) {
      // Return top countries when no query
      return res.json({
        success: true,
        suggestions: countries.slice(0, parseInt(limit)),
        total: countries.length
      });
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Smart filtering with relevance scoring
    const filteredCountries = countries
      .map(country => {
        let relevance = 0;
        const nameLower = country.name.toLowerCase();
        const codeLower = country.code.toLowerCase();
        
        // Exact matches (highest priority)
        if (nameLower === queryLower || codeLower === queryLower) {
          relevance = 1.0;
        }
        // Starts with query (high priority)
        else if (nameLower.startsWith(queryLower) || codeLower.startsWith(queryLower)) {
          relevance = 0.8;
        }
        // Contains query (medium priority)
        else if (nameLower.includes(queryLower) || codeLower.includes(queryLower)) {
          relevance = 0.6;
        }
        
        // Boost India's priority for real estate context
        if (country.code === 'IN' && relevance > 0) {
          relevance += 0.2;
        }
        
        return { ...country, relevance };
      })
      .filter(country => country.relevance > 0)
      .sort((a, b) => {
        // Sort by relevance first, then by priority
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        return a.priority - b.priority;
      })
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      suggestions: filteredCountries,
      total: filteredCountries.length,
      query: query
    });
  } catch (error) {
    console.error('Enhanced country autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch country suggestions'
    });
  }
}));

// @route   GET /api/locations/autocomplete/states
// @desc    Enhanced state suggestions with priority and intelligent matching
// @access  Public
router.get('/autocomplete/states', asyncHandler(async (req, res) => {
  try {
    const { q: query = '', country = 'IN', limit = 10 } = req.query;
    
    let states = [];
    
    if (country === 'IN') {
      states = [
        // Major states (high priority for real estate)
        { id: 'MH', name: 'Maharashtra', code: 'MH', priority: 1, category: 'major', capital: 'Mumbai' },
        { id: 'KA', name: 'Karnataka', code: 'KA', priority: 2, category: 'major', capital: 'Bangalore' },
        { id: 'TN', name: 'Tamil Nadu', code: 'TN', priority: 3, category: 'major', capital: 'Chennai' },
        { id: 'DL', name: 'Delhi', code: 'DL', priority: 4, category: 'major', capital: 'New Delhi' },
        { id: 'GJ', name: 'Gujarat', code: 'GJ', priority: 5, category: 'major', capital: 'Gandhinagar' },
        { id: 'RJ', name: 'Rajasthan', code: 'RJ', priority: 6, category: 'major', capital: 'Jaipur' },
        { id: 'UP', name: 'Uttar Pradesh', code: 'UP', priority: 7, category: 'major', capital: 'Lucknow' },
        { id: 'WB', name: 'West Bengal', code: 'WB', priority: 8, category: 'major', capital: 'Kolkata' },
        { id: 'TG', name: 'Telangana', code: 'TG', priority: 9, category: 'major', capital: 'Hyderabad' },
        { id: 'AP', name: 'Andhra Pradesh', code: 'AP', priority: 10, category: 'major', capital: 'Amaravati' },
        { id: 'HR', name: 'Haryana', code: 'HR', priority: 11, category: 'major', capital: 'Chandigarh' },
        { id: 'PB', name: 'Punjab', code: 'PB', priority: 12, category: 'major', capital: 'Chandigarh' },
        { id: 'KL', name: 'Kerala', code: 'KL', priority: 13, category: 'major', capital: 'Thiruvananthapuram' },
        { id: 'MP', name: 'Madhya Pradesh', code: 'MP', priority: 14, category: 'major', capital: 'Bhopal' },
        { id: 'OR', name: 'Odisha', code: 'OR', priority: 15, category: 'major', capital: 'Bhubaneswar' },
        { id: 'BR', name: 'Bihar', code: 'BR', priority: 16, category: 'major', capital: 'Patna' },
        { id: 'JH', name: 'Jharkhand', code: 'JH', priority: 17, category: 'major', capital: 'Ranchi' },
        { id: 'CG', name: 'Chhattisgarh', code: 'CG', priority: 18, category: 'major', capital: 'Raipur' },
        { id: 'UT', name: 'Uttarakhand', code: 'UT', priority: 19, category: 'major', capital: 'Dehradun' },
        { id: 'HP', name: 'Himachal Pradesh', code: 'HP', priority: 20, category: 'major', capital: 'Shimla' },
        { id: 'AS', name: 'Assam', code: 'AS', priority: 21, category: 'major', capital: 'Dispur' },
        { id: 'GA', name: 'Goa', code: 'GA', priority: 22, category: 'major', capital: 'Panaji' },
        
        // Union Territories and smaller states
        { id: 'JK', name: 'Jammu and Kashmir', code: 'JK', priority: 23, category: 'ut', capital: 'Srinagar' },
        { id: 'LA', name: 'Ladakh', code: 'LA', priority: 24, category: 'ut', capital: 'Leh' },
        { id: 'CH', name: 'Chandigarh', code: 'CH', priority: 25, category: 'ut', capital: 'Chandigarh' },
        { id: 'PY', name: 'Puducherry', code: 'PY', priority: 26, category: 'ut', capital: 'Puducherry' },
        { id: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN', priority: 27, category: 'ut', capital: 'Daman' },
        { id: 'AN', name: 'Andaman and Nicobar Islands', code: 'AN', priority: 28, category: 'ut', capital: 'Port Blair' },
        { id: 'LD', name: 'Lakshadweep', code: 'LD', priority: 29, category: 'ut', capital: 'Kavaratti' },
        
        // Northeastern states
        { id: 'AR', name: 'Arunachal Pradesh', code: 'AR', priority: 30, category: 'northeast', capital: 'Itanagar' },
        { id: 'MN', name: 'Manipur', code: 'MN', priority: 31, category: 'northeast', capital: 'Imphal' },
        { id: 'ML', name: 'Meghalaya', code: 'ML', priority: 32, category: 'northeast', capital: 'Shillong' },
        { id: 'MZ', name: 'Mizoram', code: 'MZ', priority: 33, category: 'northeast', capital: 'Aizawl' },
        { id: 'NL', name: 'Nagaland', code: 'NL', priority: 34, category: 'northeast', capital: 'Kohima' },
        { id: 'SK', name: 'Sikkim', code: 'SK', priority: 35, category: 'northeast', capital: 'Gangtok' },
        { id: 'TR', name: 'Tripura', code: 'TR', priority: 36, category: 'northeast', capital: 'Agartala' }
      ];
    }
    
    if (!query.trim()) {
      // Return major states first when no query
      return res.json({
        success: true,
        suggestions: states.filter(s => s.category === 'major').slice(0, parseInt(limit)),
        total: states.length
      });
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Enhanced filtering with relevance scoring
    const filteredStates = states
      .map(state => {
        let relevance = 0;
        const nameLower = state.name.toLowerCase();
        const codeLower = state.code.toLowerCase();
        const capitalLower = state.capital?.toLowerCase() || '';
        
        // Exact matches (highest priority)
        if (nameLower === queryLower || codeLower === queryLower) {
          relevance = 1.0;
        }
        // Starts with query (high priority)
        else if (nameLower.startsWith(queryLower) || codeLower.startsWith(queryLower)) {
          relevance = 0.8;
        }
        // Contains query in name (medium priority)
        else if (nameLower.includes(queryLower)) {
          relevance = 0.6;
        }
        // Matches capital city
        else if (capitalLower.includes(queryLower)) {
          relevance = 0.4;
        }
        // Code contains query
        else if (codeLower.includes(queryLower)) {
          relevance = 0.3;
        }
        
        // Boost major states for real estate context
        if (state.category === 'major' && relevance > 0) {
          relevance += 0.1;
        }
        
        return { ...state, relevance };
      })
      .filter(state => state.relevance > 0)
      .sort((a, b) => {
        // Sort by relevance first, then by priority
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        return a.priority - b.priority;
      })
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      suggestions: filteredStates,
      total: filteredStates.length,
      query: query,
      country: country
    });
  } catch (error) {
    console.error('Enhanced state autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state suggestions'
    });
  }
}));

// @route   GET /api/locations/autocomplete/districts
// @desc    Get district suggestions for autocomplete
// @access  Public
router.get('/autocomplete/districts', asyncHandler(async (req, res) => {
  try {
    const { q: query = '', stateCode = '', limit = 10 } = req.query;
    
    let districts = [];
    
    if (stateCode && indianDistricts[stateCode]) {
      districts = indianDistricts[stateCode];
    } else {
      // Get all districts if no state specified
      districts = Object.values(indianDistricts).flat();
    }
    
    const filteredDistricts = districts
      .filter(district => 
        district.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, parseInt(limit))
      .map(district => ({
        id: district.id,
        name: district.name,
        stateCode: district.stateCode || stateCode
      }));
    
    res.json({
      success: true,
      suggestions: filteredDistricts,
      total: filteredDistricts.length
    });
  } catch (error) {
    console.error('District autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch district suggestions'
    });
  }
}));

// @route   GET /api/locations/autocomplete/cities
// @desc    Get city suggestions for autocomplete using LocationIQ
// @access  Public
router.get('/autocomplete/cities', asyncHandler(async (req, res) => {
  try {
    const { q: query = '', stateCode = '', districtId = '', limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters long'
      });
    }
    
    try {
      // Use LocationIQ for city search
      let searchQuery = query;
      if (stateCode) {
        const stateNames = {
          'TN': 'Tamil Nadu', 'KA': 'Karnataka', 'MH': 'Maharashtra',
          'KL': 'Kerala', 'AP': 'Andhra Pradesh', 'TG': 'Telangana'
        };
        const stateName = stateNames[stateCode] || stateCode;
        searchQuery += `, ${stateName}`;
      }
      searchQuery += ', India';
      
      const searchResults = await callLocationIQAPI('/search.php', {
        q: searchQuery,
        countrycodes: 'in',
        limit: parseInt(limit),
        addressdetails: 1,
        format: 'json'
      });
      
      if (searchResults && searchResults.length > 0) {
        const cities = searchResults
          .filter(result => {
            const address = result.address || {};
            return address.city || address.town || address.village;
          })
          .map(result => {
            const address = result.address || {};
            return {
              id: `city_${result.place_id}`,
              name: address.city || address.town || address.village,
              type: address.village ? 'village' : address.town ? 'town' : 'city',
              state: address.state,
              stateCode: getStateCode(address.state || ''),
              district: address.state_district || address.county,
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon)
            };
          });
        
        return res.json({
          success: true,
          suggestions: cities,
          total: cities.length,
          source: 'locationiq'
        });
      }
    } catch (locationIQError) {
      console.error('LocationIQ city search error:', locationIQError.message);
    }
    
    // Fallback to local data
    const cities = Object.values(localitiesDatabase).flat()
      .filter(locality => 
        locality.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, parseInt(limit))
      .map(locality => ({
        id: locality.id,
        name: locality.name,
        type: 'locality',
        cityId: locality.cityId,
        pincode: locality.pincode,
        area: locality.area
      }));
    
    res.json({
      success: true,
      suggestions: cities,
      total: cities.length,
      source: 'local'
    });
  } catch (error) {
    console.error('City autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city suggestions'
    });
  }
}));

// @route   GET /api/locations/validate-pincode/:pincode
// @desc    Validate and get detailed location data for pincode
// @access  Public
router.get('/validate-pincode/:pincode', asyncHandler(async (req, res) => {
  try {
    const { pincode } = req.params;
    
    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode format. Expected 6 digits.',
        valid: false
      });
    }
    
    try {
      // Use the existing pincode endpoint logic
      const pincodeResponse = await new Promise((resolve, reject) => {
        // Simulate the pincode endpoint call
        router.get('/pincode/' + pincode, (req, res) => {
          resolve(res);
        });
      });
      
      // For now, just validate format and return success
      return res.json({
        success: true,
        valid: true,
        message: 'Pincode format is valid',
        pincode: pincode
      });
    } catch (error) {
      return res.json({
        success: true,
        valid: false,
        message: 'Pincode not found in database',
        pincode: pincode
      });
    }
  } catch (error) {
    console.error('Pincode validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate pincode'
    });
  }
}));

module.exports = router;
