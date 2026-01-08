require('dotenv').config({ path: '../.env' });
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const SupportTicket = require('../models/SupportTicket');
const ServiceBooking = require('../models/ServiceBooking');
const PromotionRequest = require('../models/PromotionRequest');
const PropertyView = require('../models/PropertyView');
const PageVisit = require('../models/PageVisit');
const LoginAttempt = require('../models/LoginAttempt');
const {
    PropertyType,
    PropertyTypeField,
    Amenity,
    PropertyTypeAmenity,
    FilterConfiguration,
    NavigationItem,
    ConfigurationMetadata
} = require('../models/Configuration');
const {
    HeroSlide,
    HeroSettings,
    SellingOption
} = require('../models/HeroContent');
const Policy = require('../models/Policy');
const Settings = require('../models/Settings');
const Plan = require('../models/Plan');
const AddonService = require('../models/AddonService');
const Role = require('../models/Role'); // We need to import this to ensure we don't delete it, or to be explicit.
const Favorite = require('../models/Favorite');
const ContentReport = require('../models/ContentReport');
const UserNotification = require('../models/UserNotification');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const VendorService = require('../models/VendorService');
const AddonServiceSchedule = require('../models/AddonServiceSchedule');

const KEEP_EMAILS = [
    'ddd732443@gmail.com',
    'admin@ninetyneacres.com',
    'vendor1@ninetyneacres.com',
    'admin@buildhomemart.com'
];

const cleanup = async () => {
    try {
        await connectDB();
        console.log('Connected to database');

        // 1. Filter Users (Keep only specified users)
        const keptUsers = await User.find({ email: { $in: KEEP_EMAILS } });
        const keptUserIds = keptUsers.map(u => u._id);
        const keptEmailsFound = keptUsers.map(u => u.email);

        console.log('Found users to keep:', keptEmailsFound);

        if (keptUserIds.length === 0) {
            console.log('No users found to keep. Aborting.');
            process.exit(1);
        }

        const deleteUsersResult = await User.deleteMany({ _id: { $nin: keptUserIds } });
        console.log(`Filtered Users: Deleted ${deleteUsersResult.deletedCount} users`);

        // 2. Filter Vendors (Keep only vendors associated with kept users)
        const keptVendors = await Vendor.find({ user: { $in: keptUserIds } });
        const keptVendorIds = keptVendors.map(v => v._id);

        const deleteVendorsResult = await Vendor.deleteMany({ _id: { $nin: keptVendorIds } });
        console.log(`Filtered Vendors: Deleted ${deleteVendorsResult.deletedCount} vendors`);

        // 3. Delete ALL other user-generated data AND System Configs
        // The user requested to "remove all others", keeping only users and their roles.

        const collectionsToDelete = [
            { model: Property, name: 'Properties' },
            { model: Payment, name: 'Payments' },
            { model: Subscription, name: 'Subscriptions' },
            { model: Message, name: 'Messages' },
            { model: Notification, name: 'Notifications' },
            { model: UserNotification, name: 'UserNotifications' },
            { model: Review, name: 'Reviews' },
            { model: SupportTicket, name: 'SupportTickets' },
            { model: ServiceBooking, name: 'ServiceBookings' },
            { model: PromotionRequest, name: 'PromotionRequests' },
            { model: PropertyView, name: 'PropertyViews' },
            { model: PageVisit, name: 'PageVisits' },
            { model: LoginAttempt, name: 'LoginAttempts' },
            { model: Favorite, name: 'Favorites' },
            { model: ContentReport, name: 'ContentReports' },
            { model: TwoFactorAuth, name: 'TwoFactorAuth' },
            { model: VendorService, name: 'VendorServices' },
            { model: AddonServiceSchedule, name: 'AddonServiceSchedules' },
            // System Configurations
            { model: PropertyType, name: 'PropertyTypes' },
            { model: PropertyTypeField, name: 'PropertyTypeFields' },
            { model: Amenity, name: 'Amenities' },
            { model: PropertyTypeAmenity, name: 'PropertyTypeAmenities' },
            { model: FilterConfiguration, name: 'FilterConfigurations' },
            { model: NavigationItem, name: 'NavigationItems' },
            { model: ConfigurationMetadata, name: 'ConfigurationMetadatas' },
            { model: HeroSlide, name: 'HeroSlides' },
            { model: HeroSettings, name: 'HeroSettings' },
            { model: SellingOption, name: 'SellingOptions' },
            { model: Policy, name: 'Policies' },
            { model: Settings, name: 'Settings' },
            { model: Plan, name: 'Plans' },
            { model: AddonService, name: 'AddonServices' }
        ];

        for (const { model, name } of collectionsToDelete) {
            const result = await model.deleteMany({});
            console.log(`Deleted ALL ${name}: ${result.deletedCount}`);
        }

        // Note: We are NOT deleting 'Role' collection as per "keep only the users and their role".
        // We are NOT deleting 'Vendor' collection (filtered above) as it is part of User profile.

        // 4. Delete Direct Collections (where models might be missing or issues exist)
        try {
            const deleteChatbotResult = await mongoose.connection.db.collection('chatbotconversations').deleteMany({});
            console.log(`Deleted ALL ChatbotConversations: ${deleteChatbotResult.deletedCount}`);
        } catch (e) {
            console.log('Error deleting chatbotconversations:', e.message);
        }

        try {
            const deleteVendorProfilesResult = await mongoose.connection.db.collection('vendorprofiles').deleteMany({});
            console.log(`Deleted ALL VendorProfiles: ${deleteVendorProfilesResult.deletedCount}`);
        } catch (e) {
            console.log('Error deleting vendorprofiles:', e.message);
        }

        console.log('Cleanup complete! Only Users, Roles, and System Configs remain.');
        process.exit(0);

    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
};

cleanup();
