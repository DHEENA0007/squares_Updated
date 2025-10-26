const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Review = require('../models/Review');
require('dotenv').config();

const createSampleReviews = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a vendor user
    const vendor = await User.findOne({ role: 'agent' });
    if (!vendor) {
      console.log('No vendor found. Please create a vendor first.');
      return;
    }
    console.log(`Found vendor: ${vendor.email}`);

    // Get or create some customer users
    let customer1 = await User.findOne({ email: 'customer1@example.com' });
    if (!customer1) {
      customer1 = new User({
        email: 'customer1@example.com',
        password: 'customer123',
        role: 'user',
        status: 'active',
        profile: {
          firstName: 'Rajesh',
          lastName: 'Kumar',
          phone: '+91 9876543211',
          emailVerified: true
        }
      });
      await customer1.save();
      console.log('Created customer1');
    }

    let customer2 = await User.findOne({ email: 'customer2@example.com' });
    if (!customer2) {
      customer2 = new User({
        email: 'customer2@example.com',
        password: 'customer123',
        role: 'user',
        status: 'active',
        profile: {
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '+91 9876543212',
          emailVerified: true
        }
      });
      await customer2.save();
      console.log('Created customer2');
    }

    let customer3 = await User.findOne({ email: 'customer3@example.com' });
    if (!customer3) {
      customer3 = new User({
        email: 'customer3@example.com',
        password: 'customer123',
        role: 'user',
        status: 'active',
        profile: {
          firstName: 'Amit',
          lastName: 'Patel',
          phone: '+91 9876543213',
          emailVerified: true
        }
      });
      await customer3.save();
      console.log('Created customer3');
    }

    // Get or create a sample property
    let property = await Property.findOne({ owner: vendor._id });
    if (!property) {
      property = new Property({
        title: '3BHK Luxury Apartment in Bandra',
        description: 'Beautiful spacious apartment with modern amenities',
        type: 'apartment',
        listingType: 'sale',
        price: 15000000,
        area: {
          builtUp: 1200,
          carpet: 1000,
          unit: 'sqft'
        },
        bedrooms: 3,
        bathrooms: 2,
        address: {
          street: '123 Linking Road',
          locality: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050'
        },
        amenities: ['parking', 'gym', 'swimming_pool', 'security'],
        owner: vendor._id,
        images: []
      });
      await property.save();
      console.log('Created sample property');
    }

    // Check if reviews already exist
    const existingReviews = await Review.countDocuments({ vendor: vendor._id });
    if (existingReviews > 0) {
      console.log(`${existingReviews} reviews already exist for this vendor.`);
      await mongoose.disconnect();
      return;
    }

    // Create sample reviews
    const sampleReviews = [
      {
        vendor: vendor._id,
        client: customer1._id,
        property: property._id,
        rating: 5,
        title: 'Excellent service and professional approach!',
        comment: 'Working with this vendor was a fantastic experience. They were very professional, responsive, and helped us find our dream home. The entire process was smooth and transparent. Highly recommended!',
        reviewType: 'property',
        isVerified: true,
        isPublic: true,
        helpfulVotes: 8,
        unhelpfulVotes: 0,
        tags: ['professional', 'responsive', 'transparent', 'helpful'],
        vendorResponse: {
          message: 'Thank you so much for your kind words! It was a pleasure working with you and your family. Wishing you all the best in your new home!',
          respondedAt: new Date()
        }
      },
      {
        vendor: vendor._id,
        client: customer2._id,
        property: property._id,
        rating: 4,
        title: 'Good experience overall',
        comment: 'The vendor was knowledgeable and showed us several good options. The paperwork process took a bit longer than expected, but everything worked out well in the end. Would recommend.',
        reviewType: 'property',
        isVerified: false,
        isPublic: true,
        helpfulVotes: 3,
        unhelpfulVotes: 1,
        tags: ['knowledgeable', 'patient']
      },
      {
        vendor: vendor._id,
        client: customer3._id,
        rating: 5,
        title: 'Outstanding customer service',
        comment: 'Exceptional service from start to finish. The vendor went above and beyond to understand our requirements and found us exactly what we were looking for. Great communication throughout.',
        reviewType: 'general',
        isVerified: true,
        isPublic: true,
        helpfulVotes: 12,
        unhelpfulVotes: 0,
        tags: ['exceptional', 'understanding', 'great-communication'],
        vendorResponse: {
          message: 'Thank you for the wonderful feedback! Customer satisfaction is our top priority, and we are thrilled we could help you find what you were looking for.',
          respondedAt: new Date()
        }
      },
      {
        vendor: vendor._id,
        client: customer1._id,
        rating: 4,
        title: 'Professional and reliable',
        comment: 'Very reliable vendor with good market knowledge. Helped us with property valuation and market insights. Response time could be better but overall satisfied.',
        reviewType: 'general',
        isVerified: true,
        isPublic: true,
        helpfulVotes: 5,
        unhelpfulVotes: 0,
        tags: ['reliable', 'market-knowledge', 'valuation']
      },
      {
        vendor: vendor._id,
        client: customer2._id,
        rating: 3,
        title: 'Average experience',
        comment: 'The service was okay. Got the job done but nothing exceptional. Communication could be improved and some processes seemed slow.',
        reviewType: 'general',
        isVerified: false,
        isPublic: true,
        helpfulVotes: 2,
        unhelpfulVotes: 3,
        tags: ['average', 'slow-process']
      }
    ];

    // Insert reviews with some delay to simulate different dates
    for (let i = 0; i < sampleReviews.length; i++) {
      const reviewData = sampleReviews[i];
      const review = new Review(reviewData);
      
      // Set different creation dates
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      review.createdAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
      
      await review.save();
      console.log(`Created review ${i + 1}: "${reviewData.title}"`);
    }

    console.log(`\nSuccessfully created ${sampleReviews.length} sample reviews!`);
    console.log('Review data has been populated in the database.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error creating sample reviews:', error);
    process.exit(1);
  }
};

createSampleReviews();