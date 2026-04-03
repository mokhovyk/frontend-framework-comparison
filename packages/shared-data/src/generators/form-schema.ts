import type { FormSchema, FormField, RepeatableGroupField } from '../types.js';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia',
  'Brazil', 'India', 'China', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium', 'Portugal',
  'Ireland', 'New Zealand', 'Singapore', 'South Korea', 'Taiwan', 'Poland', 'Czech Republic',
  'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Greece', 'Turkey', 'Israel', 'UAE',
  'Saudi Arabia', 'South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Argentina', 'Chile',
  'Colombia', 'Peru', 'Philippines', 'Thailand', 'Vietnam', 'Indonesia',
];

const DEPARTMENTS = [
  'Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations',
  'Legal', 'Product', 'Design', 'Customer Support', 'Research', 'Quality Assurance',
  'IT', 'Administration', 'Business Development', 'Data Science', 'Security',
  'DevOps', 'Content', 'Analytics', 'Compliance', 'Procurement', 'Logistics',
  'Training', 'Facilities', 'Public Relations', 'Investor Relations', 'Strategy',
  'Partnerships', 'Growth', 'International', 'Government Affairs', 'Environmental',
  'Diversity', 'Innovation', 'Architecture', 'Platform', 'Infrastructure', 'Mobile',
  'Web', 'Backend', 'Frontend', 'Full Stack', 'Database', 'Cloud', 'Network',
  'Embedded', 'Robotics', 'AI/ML', 'Blockchain',
];

const EXPERIENCE_LEVELS = [
  'Entry Level', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal', 'Staff',
  'Distinguished', 'Fellow', 'Executive',
];

const EMPLOYMENT_TYPES = [
  'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship',
];

function toOptions(items: string[]): { label: string; value: string }[] {
  return items.map((item) => ({ label: item, value: item.toLowerCase().replace(/\s+/g, '-') }));
}

// 10 text inputs
const textFields: FormField[] = [
  {
    name: 'firstName', type: 'text', label: 'First Name', placeholder: 'Enter first name',
    validation: [
      { type: 'required', message: 'First name is required' },
      { type: 'minLength', value: 2, message: 'Must be at least 2 characters' },
      { type: 'maxLength', value: 50, message: 'Must be at most 50 characters' },
    ],
  },
  {
    name: 'lastName', type: 'text', label: 'Last Name', placeholder: 'Enter last name',
    validation: [
      { type: 'required', message: 'Last name is required' },
      { type: 'minLength', value: 2, message: 'Must be at least 2 characters' },
    ],
  },
  {
    name: 'email', type: 'text', label: 'Email', placeholder: 'name@example.com',
    validation: [
      { type: 'required', message: 'Email is required' },
      { type: 'pattern', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Invalid email format' },
    ],
  },
  {
    name: 'phone', type: 'text', label: 'Phone', placeholder: '+1 (555) 000-0000',
    validation: [
      { type: 'pattern', value: '^\\+?[\\d\\s\\-()]{7,20}$', message: 'Invalid phone number' },
    ],
  },
  {
    name: 'company', type: 'text', label: 'Company', placeholder: 'Company name',
    validation: [
      { type: 'required', message: 'Company is required' },
    ],
  },
  {
    name: 'jobTitle', type: 'text', label: 'Job Title', placeholder: 'Your role',
    validation: [
      { type: 'required', message: 'Job title is required' },
    ],
  },
  {
    name: 'website', type: 'text', label: 'Website', placeholder: 'https://example.com',
    validation: [
      { type: 'pattern', value: '^https?://.+', message: 'Must be a valid URL starting with http(s)://' },
    ],
  },
  {
    name: 'city', type: 'text', label: 'City', placeholder: 'City',
    validation: [
      { type: 'required', message: 'City is required' },
    ],
  },
  {
    name: 'zipCode', type: 'text', label: 'Zip Code', placeholder: '00000',
    validation: [
      { type: 'pattern', value: '^\\d{5}(-\\d{4})?$', message: 'Invalid ZIP code (use 00000 or 00000-0000)' },
    ],
    condition: { dependsOn: 'country', value: 'united-states' },
  },
  {
    name: 'otherDepartment', type: 'text', label: 'Specify Department', placeholder: 'Department name',
    validation: [
      { type: 'required', message: 'Please specify the department' },
    ],
    condition: { dependsOn: 'department', value: 'other' },
  },
];

// 5 selects (with 50 options each)
const selectFields: FormField[] = [
  {
    name: 'country', type: 'select', label: 'Country',
    options: toOptions(COUNTRIES),
    validation: [{ type: 'required', message: 'Country is required' }],
  },
  {
    name: 'state', type: 'select', label: 'State',
    options: toOptions(US_STATES),
    validation: [{ type: 'required', message: 'State is required' }],
    condition: { dependsOn: 'country', value: 'united-states' },
  },
  {
    name: 'department', type: 'select', label: 'Department',
    options: [...toOptions(DEPARTMENTS), { label: 'Other', value: 'other' }],
    validation: [{ type: 'required', message: 'Department is required' }],
  },
  {
    name: 'experienceLevel', type: 'select', label: 'Experience Level',
    options: toOptions(EXPERIENCE_LEVELS),
    validation: [{ type: 'required', message: 'Experience level is required' }],
  },
  {
    name: 'employmentType', type: 'select', label: 'Employment Type',
    options: toOptions(EMPLOYMENT_TYPES),
    validation: [{ type: 'required', message: 'Employment type is required' }],
  },
];

// 5 checkboxes
const checkboxFields: FormField[] = [
  {
    name: 'agreeTerms', type: 'checkbox', label: 'I agree to the Terms of Service',
    validation: [{ type: 'required', message: 'You must agree to the terms' }],
  },
  {
    name: 'agreePrivacy', type: 'checkbox', label: 'I agree to the Privacy Policy',
    validation: [{ type: 'required', message: 'You must agree to the privacy policy' }],
  },
  {
    name: 'newsletter', type: 'checkbox', label: 'Subscribe to newsletter',
    validation: [],
  },
  {
    name: 'remoteWork', type: 'checkbox', label: 'Available for remote work',
    validation: [],
  },
  {
    name: 'relocation', type: 'checkbox', label: 'Willing to relocate',
    validation: [],
    condition: { dependsOn: 'remoteWork', value: false },
  },
];

// 3 radio groups
const radioFields: FormField[] = [
  {
    name: 'gender', type: 'radio', label: 'Gender',
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
      { label: 'Non-binary', value: 'non-binary' },
      { label: 'Prefer not to say', value: 'prefer-not' },
    ],
    validation: [{ type: 'required', message: 'Please select an option' }],
  },
  {
    name: 'availability', type: 'radio', label: 'Availability',
    options: [
      { label: 'Immediately', value: 'immediate' },
      { label: 'Within 2 weeks', value: '2-weeks' },
      { label: 'Within 1 month', value: '1-month' },
      { label: 'More than 1 month', value: 'more' },
    ],
    validation: [{ type: 'required', message: 'Please select availability' }],
  },
  {
    name: 'preferredContact', type: 'radio', label: 'Preferred Contact Method',
    options: [
      { label: 'Email', value: 'email' },
      { label: 'Phone', value: 'phone' },
      { label: 'No preference', value: 'none' },
    ],
    validation: [],
  },
];

// 3 date pickers
const dateFields: FormField[] = [
  {
    name: 'birthDate', type: 'date', label: 'Date of Birth',
    validation: [{ type: 'required', message: 'Date of birth is required' }],
  },
  {
    name: 'startDate', type: 'date', label: 'Preferred Start Date',
    validation: [{ type: 'required', message: 'Start date is required' }],
    condition: { dependsOn: 'availability', value: 'more' },
  },
  {
    name: 'certificationDate', type: 'date', label: 'Last Certification Date',
    validation: [],
    condition: { dependsOn: 'experienceLevel', value: 'senior' },
  },
];

// 2 textareas
const textareaFields: FormField[] = [
  {
    name: 'bio', type: 'textarea', label: 'Short Bio', placeholder: 'Tell us about yourself...',
    validation: [
      { type: 'maxLength', value: 500, message: 'Bio must be 500 characters or fewer' },
    ],
  },
  {
    name: 'coverLetter', type: 'textarea', label: 'Cover Letter', placeholder: 'Why are you interested...',
    validation: [
      { type: 'required', message: 'Cover letter is required' },
      { type: 'minLength', value: 50, message: 'Must be at least 50 characters' },
    ],
  },
];

// 2 file inputs (UI only)
const fileFields: FormField[] = [
  {
    name: 'resume', type: 'file', label: 'Upload Resume',
    validation: [{ type: 'required', message: 'Resume is required' }],
  },
  {
    name: 'portfolio', type: 'file', label: 'Upload Portfolio',
    validation: [],
  },
];

// Repeatable group: 5 fields per group, up to 50 groups
const repeatableGroupFields: RepeatableGroupField[] = [
  {
    name: 'refName', type: 'text', label: 'Name', placeholder: 'Reference name',
    validation: [{ type: 'required', message: 'Name is required' }],
  },
  {
    name: 'refRole', type: 'text', label: 'Role', placeholder: 'Their role',
    validation: [{ type: 'required', message: 'Role is required' }],
  },
  {
    name: 'refEmail', type: 'text', label: 'Email', placeholder: 'email@example.com',
    validation: [
      { type: 'required', message: 'Email is required' },
      { type: 'pattern', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Invalid email' },
    ],
  },
  {
    name: 'refPhone', type: 'text', label: 'Phone', placeholder: '+1 (555) 000-0000',
    validation: [],
  },
  {
    name: 'refNotes', type: 'textarea', label: 'Notes', placeholder: 'Additional notes...',
    validation: [{ type: 'maxLength', value: 200, message: 'Max 200 characters' }],
  },
];

// Combine all 30 fields in order
const allFields: FormField[] = [
  ...textFields.slice(0, 3),    // firstName, lastName, email
  ...selectFields.slice(0, 1),   // country
  ...selectFields.slice(1, 2),   // state (conditional on country)
  ...textFields.slice(3, 5),    // phone, company
  ...selectFields.slice(2, 5),   // department, experienceLevel, employmentType
  ...textFields.slice(5, 8),    // jobTitle, website, city
  ...textFields.slice(8, 10),   // zipCode (conditional), otherDepartment (conditional)
  ...radioFields,                // gender, availability, preferredContact
  ...dateFields,                 // birthDate, startDate (conditional), certificationDate (conditional)
  ...checkboxFields,             // agreeTerms, agreePrivacy, newsletter, remoteWork, relocation (conditional)
  ...textareaFields,             // bio, coverLetter
  ...fileFields,                 // resume, portfolio
];

export const formSchema: FormSchema = {
  fields: allFields,
  repeatableGroup: {
    name: 'references',
    label: 'References',
    maxCount: 50,
    fields: repeatableGroupFields,
  },
};
