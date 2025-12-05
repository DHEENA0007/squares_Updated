import { Home, Users, UserCheck, MessageSquare, PaintRoller, SquareChartGantt, LandPlot, NotebookPen, Package, FileText, CheckCircle, XCircle, Shield, Headphones, BarChart3, Star, Bell, Search, Heart, GitCompare, HomeIcon, Wrench, User, Settings, Building2, Plus, Briefcase, Crown, CreditCard, type LucideIcon } from "lucide-react";

export interface PageConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  category: 'admin' | 'subadmin' | 'vendor' | 'customer';
  description: string;
  subLabel?: string;
}

export const PORTAL_PAGES: PageConfig[] = [
  // Super Admin Pages
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: Home,
    category: 'admin',
    description: 'Main dashboard with analytics and overview'
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: Users,
    category: 'admin',
    description: 'User management and administration'
  },
  {
    id: 'vendor_approvals',
    label: 'Vendor Approvals',
    path: '/admin/vendor-approvals',
    icon: UserCheck,
    category: 'admin',
    description: 'Approve or reject vendor registrations'
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/admin/messages',
    icon: MessageSquare,
    category: 'admin',
    description: 'Admin messaging system'
  },
  {
    id: 'roles',
    label: 'Roles',
    path: '/admin/roles',
    icon: PaintRoller,
    category: 'admin',
    description: 'Role and page access management'
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/admin/clients',
    icon: SquareChartGantt,
    category: 'admin',
    description: 'Client management'
  },
  {
    id: 'properties',
    label: 'Properties',
    path: '/admin/properties',
    icon: LandPlot,
    category: 'admin',
    description: 'Property listing management'
  },
  {
    id: 'plans',
    label: 'Plans',
    path: '/admin/plans',
    icon: NotebookPen,
    category: 'admin',
    description: 'Subscription plan management'
  },
  {
    id: 'addons',
    label: 'Addons',
    path: '/admin/addons',
    icon: Package,
    category: 'admin',
    description: 'Addon services management'
  },
  {
    id: 'filter',
    label: 'Filter',
    path: '/admin/filter',
    icon: Settings,
    category: 'admin',
    description: 'Dynamic property and filter configuration',
    subLabel: 'System'
  },
  {
    id: 'privacy_policy',
    label: 'Privacy Policy',
    path: '/admin/policy-editor/privacy-policy',
    icon: FileText,
    category: 'admin',
    description: 'Edit privacy policy',
    subLabel: 'Policy'
  },
  {
    id: 'refund_policy',
    label: 'Refund Policy',
    path: '/admin/policy-editor/refund-policy',
    icon: FileText,
    category: 'admin',
    description: 'Edit refund policy',
    subLabel: 'Policy'
  },

  // Sub Admin Pages
  {
    id: 'subadmin_dashboard',
    label: 'Dashboard',
    path: '/subadmin/dashboard',
    icon: Home,
    category: 'subadmin',
    description: 'Sub admin dashboard'
  },
  {
    id: 'property_reviews',
    label: 'Property Reviews',
    path: '/subadmin/property-reviews',
    icon: CheckCircle,
    category: 'subadmin',
    description: 'Review submitted properties'
  },
  {
    id: 'property_rejections',
    label: 'Property Rejections',
    path: '/subadmin/property-rejections',
    icon: XCircle,
    category: 'subadmin',
    description: 'Manage rejected properties'
  },
  // {
  //   id: 'content_moderation',
  //   label: 'Content Moderation',
  //   path: '/subadmin/content-moderation',
  //   icon: Shield,
  //   category: 'subadmin',
  //   description: 'Moderate user-generated content'
  // },
  {
    id: 'support_tickets',
    label: 'Support Tickets',
    path: '/subadmin/support-tickets',
    icon: Headphones,
    category: 'subadmin',
    description: 'Handle customer support tickets'
  },
  {
    id: 'vendor_performance',
    label: 'Vendor Performance',
    path: '/subadmin/vendor-performance',
    icon: BarChart3,
    category: 'subadmin',
    description: 'Track vendor performance metrics'
  },
  {
    id: 'addon_services',
    label: 'Addon Services',
    path: '/subadmin/addon-services',
    icon: Package,
    category: 'subadmin',
    description: 'Manage addon services'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/subadmin/notifications',
    icon: Bell,
    category: 'subadmin',
    description: 'Send system notifications'
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/subadmin/reports',
    icon: FileText,
    category: 'subadmin',
    description: 'Generate system reports'
  },
  {
    id: 'subadmin_privacy_policy',
    label: 'Privacy Policy',
    path: '/subadmin/policy-editor/privacy-policy',
    icon: FileText,
    category: 'subadmin',
    description: 'Edit privacy policy',
    subLabel: 'Policy'
  },
  {
    id: 'subadmin_refund_policy',
    label: 'Refund Policy',
    path: '/subadmin/policy-editor/refund-policy',
    icon: FileText,
    category: 'subadmin',
    description: 'Edit refund policy',
    subLabel: 'Policy'
  },

  // Vendor Pages
  {
    id: 'vendor_dashboard',
    label: 'Dashboard',
    path: '/vendor/dashboard',
    icon: Home,
    category: 'vendor',
    description: 'Vendor dashboard'
  },
  {
    id: 'vendor_properties',
    label: 'My Properties',
    path: '/vendor/properties',
    icon: Building2,
    category: 'vendor',
    description: 'Manage your property listings'
  },
  {
    id: 'vendor_add_property',
    label: 'Add Property',
    path: '/vendor/properties/add',
    icon: Plus,
    category: 'vendor',
    description: 'Add new property listing'
  },
  // {
  //   id: 'vendor_leads',
  //   label: 'Leads',
  //   path: '/vendor/leads',
  //   icon: Users,
  //   category: 'vendor',
  //   description: 'View and manage leads'
  // },
  {
    id: 'vendor_messages',
    label: 'Messages',
    path: '/vendor/messages',
    icon: MessageSquare,
    category: 'vendor',
    description: 'Vendor messaging system'
  },
  {
    id: 'vendor_analytics',
    label: 'Analytics',
    path: '/vendor/analytics',
    icon: BarChart3,
    category: 'vendor',
    description: 'View analytics and insights'
  },
  // {
  //   id: 'vendor_services',
  //   label: 'Services',
  //   path: '/vendor/services',
  //   icon: Briefcase,
  //   category: 'vendor',
  //   description: 'Manage services offered'
  // },
  {
    id: 'vendor_subscription',
    label: 'Subscription',
    path: '/vendor/subscription-manager',
    icon: Crown,
    category: 'vendor',
    description: 'Manage subscription plan'
  },
  {
    id: 'vendor_billing',
    label: 'Billing',
    path: '/vendor/billing',
    icon: CreditCard,
    category: 'vendor',
    description: 'View billing and invoices'
  },
  {
    id: 'vendor_reviews',
    label: 'Reviews',
    path: '/vendor/reviews',
    icon: Star,
    category: 'vendor',
    description: 'View customer reviews'
  },
  {
    id: 'vendor_profile',
    label: 'Profile',
    path: '/vendor/profile',
    icon: Settings,
    category: 'vendor',
    description: 'Manage vendor profile'
  },

  // Customer Pages
  {
    id: 'customer_dashboard',
    label: 'Dashboard',
    path: '/customer/dashboard',
    icon: Home,
    category: 'customer',
    description: 'Customer dashboard'
  },
  {
    id: 'customer_search',
    label: 'Search Properties',
    path: '/customer/search',
    icon: Search,
    category: 'customer',
    description: 'Search for properties'
  },
  {
    id: 'customer_favorites',
    label: 'My Favorites',
    path: '/customer/favorites',
    icon: Heart,
    category: 'customer',
    description: 'Manage favorite properties'
  },
  {
    id: 'customer_compare',
    label: 'Compare',
    path: '/customer/compare',
    icon: GitCompare,
    category: 'customer',
    description: 'Compare properties'
  },
  {
    id: 'customer_owned_properties',
    label: 'Owned Properties',
    path: '/customer/owned-properties',
    icon: HomeIcon,
    category: 'customer',
    description: 'View owned properties'
  },
  {
    id: 'customer_messages',
    label: 'Messages',
    path: '/customer/messages',
    icon: MessageSquare,
    category: 'customer',
    description: 'Customer messaging'
  },
  // {
  //   id: 'customer_services',
  //   label: 'Services',
  //   path: '/customer/services',
  //   icon: Wrench,
  //   category: 'customer',
  //   description: 'Request services'
  // },
  {
    id: 'customer_reviews',
    label: 'Reviews',
    path: '/customer/reviews',
    icon: Star,
    category: 'customer',
    description: 'Write and manage reviews'
  },
  {
    id: 'customer_profile',
    label: 'Profile',
    path: '/customer/profile',
    icon: User,
    category: 'customer',
    description: 'Manage profile'
  },
  {
    id: 'customer_settings',
    label: 'Settings',
    path: '/customer/settings',
    icon: Settings,
    category: 'customer',
    description: 'Account settings'
  },
];

export const getPagesByCategory = (category: 'admin' | 'subadmin' | 'vendor' | 'customer'): PageConfig[] => {
  return PORTAL_PAGES.filter(page => page.category === category);
};

export const getPageById = (id: string): PageConfig | undefined => {
  return PORTAL_PAGES.find(page => page.id === id);
};

export const getPagesByIds = (ids: string[]): PageConfig[] => {
  return PORTAL_PAGES.filter(page => ids.includes(page.id));
};
