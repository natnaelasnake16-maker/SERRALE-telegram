export type ProviderAccent = 'blue' | 'green';

export interface ProviderCategoryDefinition {
    label: string;
    shortLabel: string;
    accent: ProviderAccent;
    icon: string;
    subcategories: string[];
}

export const PROVIDER_CATALOG: ProviderCategoryDefinition[] = [
    {
        label: 'Software Development & IT',
        shortLabel: 'Software & IT',
        accent: 'blue',
        icon: 'code',
        subcategories: [
            'Web Development',
            'Mobile App Development',
            'Software Development',
            'UI/UX Design',
            'Cloud & DevOps',
            'Cybersecurity',
            'QA & Testing',
            'IT Support',
        ],
    },
    {
        label: 'Data, AI & Analytics',
        shortLabel: 'Data & AI',
        accent: 'blue',
        icon: 'database',
        subcategories: [
            'Data Analysis',
            'Data Visualization',
            'Business Intelligence',
            'Machine Learning',
            'AI Automation',
            'Research & Insights',
        ],
    },
    {
        label: 'Design, Branding & Creative',
        shortLabel: 'Design & Creative',
        accent: 'green',
        icon: 'palette',
        subcategories: [
            'Brand Identity',
            'Graphic Design',
            'Packaging Design',
            'Product Design',
            'Illustration',
            'Presentation Design',
        ],
    },
    {
        label: 'Writing, Translation & Editing',
        shortLabel: 'Writing & Translation',
        accent: 'green',
        icon: 'pen',
        subcategories: [
            'Technical Writing',
            'Copywriting',
            'Translation',
            'Editing & Proofreading',
            'Grant & Proposal Writing',
        ],
    },
    {
        label: 'Digital Marketing & Sales',
        shortLabel: 'Marketing & Sales',
        accent: 'green',
        icon: 'megaphone',
        subcategories: [
            'Digital Marketing',
            'SEO',
            'Social Media Management',
            'Performance Marketing',
            'Sales Enablement',
            'Lead Generation',
        ],
    },
    {
        label: 'Admin & Customer Support',
        shortLabel: 'Admin Support',
        accent: 'green',
        icon: 'headphones',
        subcategories: [
            'Virtual Assistance',
            'Customer Support',
            'Project Coordination',
            'Data Entry',
            'Operations Support',
        ],
    },
    {
        label: 'Finance, Accounting & Tax',
        shortLabel: 'Finance & Accounting',
        accent: 'blue',
        icon: 'calculator',
        subcategories: [
            'Bookkeeping',
            'Financial Analysis',
            'Tax Advisory',
            'Audit Support',
            'Payroll',
        ],
    },
    {
        label: 'Legal, Compliance & Business Consulting',
        shortLabel: 'Legal & Consulting',
        accent: 'blue',
        icon: 'scale',
        subcategories: [
            'Legal Research',
            'Contract Support',
            'Compliance',
            'Business Consulting',
            'Operations Strategy',
        ],
    },
    {
        label: 'Construction, Engineering & Architecture',
        shortLabel: 'Engineering & Architecture',
        accent: 'blue',
        icon: 'hard-hat',
        subcategories: [
            'Architecture',
            'Interior Design',
            'Civil Engineering',
            'Structural Engineering',
            'Electrical Engineering',
            'Project Management',
        ],
    },
    {
        label: 'Media, Video & Photography',
        shortLabel: 'Media & Video',
        accent: 'green',
        icon: 'camera',
        subcategories: [
            'Photography',
            'Video Production',
            'Video Editing',
            'Motion Graphics',
            'Audio Production',
        ],
    },
    {
        label: 'Education & Training',
        shortLabel: 'Education',
        accent: 'green',
        icon: 'graduation-cap',
        subcategories: [
            'Tutoring',
            'Corporate Training',
            'Instructional Design',
            'Curriculum Development',
        ],
    },
    {
        label: 'Home, Field & Technical Services',
        shortLabel: 'Field Services',
        accent: 'green',
        icon: 'wrench',
        subcategories: [
            'Plumbing',
            'Electrical Repair',
            'Appliance Repair',
            'HVAC',
            'Maintenance',
            'Field Technical Support',
        ],
    },
    {
        label: 'Other',
        shortLabel: 'Other',
        accent: 'blue',
        icon: 'briefcase',
        subcategories: ['Other'],
    },
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
    'software & it services': 'Software Development & IT',
    'software & it': 'Software Development & IT',
    'construction & engineering': 'Construction, Engineering & Architecture',
    'design & creative': 'Design, Branding & Creative',
    'sales & marketing': 'Digital Marketing & Sales',
    'writing & translation': 'Writing, Translation & Editing',
    'admin & customer support': 'Admin & Customer Support',
    'finance & accounting': 'Finance, Accounting & Tax',
    legal: 'Legal, Compliance & Business Consulting',
    'data science & analytics': 'Data, AI & Analytics',
    other: 'Other',
    'miscellaneous / other': 'Other',
};

const SUBCATEGORY_ALIASES: Record<string, { category: string; subcategory: string }> = {
    'package design': {
        category: 'Design, Branding & Creative',
        subcategory: 'Packaging Design',
    },
    'logo design': {
        category: 'Design, Branding & Creative',
        subcategory: 'Brand Identity',
    },
    'software development': {
        category: 'Software Development & IT',
        subcategory: 'Software Development',
    },
    'web development': {
        category: 'Software Development & IT',
        subcategory: 'Web Development',
    },
    cybersecurity: {
        category: 'Software Development & IT',
        subcategory: 'Cybersecurity',
    },
    'ui/ux design': {
        category: 'Software Development & IT',
        subcategory: 'UI/UX Design',
    },
    'civil engineering': {
        category: 'Construction, Engineering & Architecture',
        subcategory: 'Civil Engineering',
    },
    plumbing: {
        category: 'Home, Field & Technical Services',
        subcategory: 'Plumbing',
    },
    architecture: {
        category: 'Construction, Engineering & Architecture',
        subcategory: 'Architecture',
    },
    'interior design': {
        category: 'Construction, Engineering & Architecture',
        subcategory: 'Interior Design',
    },
    'digital marketing': {
        category: 'Digital Marketing & Sales',
        subcategory: 'Digital Marketing',
    },
    'social media management': {
        category: 'Digital Marketing & Sales',
        subcategory: 'Social Media Management',
    },
    'graphic design': {
        category: 'Design, Branding & Creative',
        subcategory: 'Graphic Design',
    },
    illustration: {
        category: 'Design, Branding & Creative',
        subcategory: 'Illustration',
    },
    photography: {
        category: 'Media, Video & Photography',
        subcategory: 'Photography',
    },
    'video production': {
        category: 'Media, Video & Photography',
        subcategory: 'Video Production',
    },
    bookkeeping: {
        category: 'Finance, Accounting & Tax',
        subcategory: 'Bookkeeping',
    },
    translation: {
        category: 'Writing, Translation & Editing',
        subcategory: 'Translation',
    },
};

const CATALOG_BY_LABEL = new Map(PROVIDER_CATALOG.map((category) => [category.label, category]));

function normalizeKey(value?: string | null) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

export function getProviderCategory(label?: string | null) {
    if (!label) {
        return null;
    }

    return CATALOG_BY_LABEL.get(label) || null;
}

export function getProviderSubcategories(category?: string | null) {
    return getProviderCategory(category)?.subcategories || [];
}

export function getCategoryBySubcategory(subcategory?: string | null) {
    const normalized = normalizeKey(subcategory);
    if (!normalized) {
        return null;
    }

    const alias = SUBCATEGORY_ALIASES[normalized];
    if (alias) {
        return getProviderCategory(alias.category);
    }

    return (
        PROVIDER_CATALOG.find((category) =>
            category.subcategories.some((entry) => normalizeKey(entry) === normalized)
        ) || null
    );
}

export function normalizeProviderClassification(category?: string | null, subcategory?: string | null) {
    const normalizedCategory = normalizeKey(category);
    const normalizedSubcategory = normalizeKey(subcategory);

    const categoryAlias = CATEGORY_ALIASES[normalizedCategory];
    const categoryValue = categoryAlias || getProviderCategory(category)?.label || null;

    const subcategoryAlias = SUBCATEGORY_ALIASES[normalizedSubcategory];
    if (subcategoryAlias) {
        return {
            category: subcategoryAlias.category,
            sub_category: subcategoryAlias.subcategory,
        };
    }

    if (categoryValue) {
        const matchedSubcategory = getProviderSubcategories(categoryValue).find(
            (entry) => normalizeKey(entry) === normalizedSubcategory
        );

        return {
            category: categoryValue,
            sub_category: matchedSubcategory || null,
        };
    }

    const inferredCategory = getCategoryBySubcategory(subcategory);
    if (inferredCategory) {
        const matchedSubcategory = inferredCategory.subcategories.find(
            (entry) => normalizeKey(entry) === normalizedSubcategory
        );

        return {
            category: inferredCategory.label,
            sub_category: matchedSubcategory || null,
        };
    }

    return {
        category: null,
        sub_category: null,
    };
}
