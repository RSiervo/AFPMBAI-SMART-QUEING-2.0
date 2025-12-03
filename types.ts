
export enum ServiceType {
  PRIORITY = 'PRIORITY',
  REFUND_DIVIDEND = 'REFUND_DIVIDEND',
  TERMINATION_CSV = 'TERMINATION_CSV',
  MATURITY_BONUS = 'MATURITY_BONUS',
  EQUITY_POLICY_LOAN = 'EQUITY_POLICY_LOAN',
  SALARY_LOAN = 'SALARY_LOAN',
  PAYMENT = 'PAYMENT',
  REAL_ESTATE = 'REAL_ESTATE',
  ACCOUNTS_MONITORING = 'ACCOUNTS_MONITORING',
  BILLING_COLLECTION = 'BILLING_COLLECTION',
  UNDERWRITING = 'UNDERWRITING',
  DISABILITY_DEATH = 'DISABILITY_DEATH'
}

export enum TicketStatus {
  WAITING = 'WAITING',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export interface Ticket {
  id: string;
  number: string;
  serviceType: ServiceType;
  status: TicketStatus;
  createdAt: number;
  servedAt?: number;
  completedAt?: number;
  recalledAt?: number; // Added field to track recalls
  counter?: number; // The counter number serving this ticket
  customerName?: string; // Added customer name field
}

export interface ServiceDefinition {
  type: ServiceType;
  label: string;
  prefix: string;
  description: string;
  icon: string; // Icon name reference
}

export const SERVICES: ServiceDefinition[] = [
  { 
    type: ServiceType.PRIORITY, 
    label: 'Senior / PWD / Pregnant', 
    prefix: 'A', 
    description: 'Priority lane for eligible members',
    icon: 'Accessibility'
  },
  { 
    type: ServiceType.REFUND_DIVIDEND, 
    label: 'Refund & Dividend', 
    prefix: 'B', 
    description: 'Claim refunds and dividend payouts',
    icon: 'Undo2'
  },
  { 
    type: ServiceType.TERMINATION_CSV, 
    label: 'Termination Benefit / CSV', 
    prefix: 'C', 
    description: 'Account termination or Cash Surrender Value',
    icon: 'UserX'
  },
  { 
    type: ServiceType.MATURITY_BONUS, 
    label: 'Maturity / Bonus', 
    prefix: 'D', 
    description: 'Policy maturity and bonus claims',
    icon: 'CalendarCheck'
  },
  { 
    type: ServiceType.EQUITY_POLICY_LOAN, 
    label: 'Equity / Policy Loan', 
    prefix: 'E', 
    description: 'Apply for equity or policy loans',
    icon: 'FileText'
  },
  { 
    type: ServiceType.SALARY_LOAN, 
    label: 'Salary Loan / MEDAL', 
    prefix: 'F', 
    description: 'Salary loan applications and MEDAL',
    icon: 'Wallet'
  },
  { 
    type: ServiceType.PAYMENT, 
    label: 'Payment', 
    prefix: 'G', 
    description: 'Premium payments and loan repayments',
    icon: 'CreditCard'
  },
  { 
    type: ServiceType.REAL_ESTATE, 
    label: 'Real Estate', 
    prefix: 'H', 
    description: 'Housing and real estate inquiries',
    icon: 'Home'
  },
  { 
    type: ServiceType.ACCOUNTS_MONITORING, 
    label: 'Accounts Monitoring', 
    prefix: 'I', 
    description: 'Check account status and history',
    icon: 'Monitor'
  },
  { 
    type: ServiceType.BILLING_COLLECTION, 
    label: 'Billing and Collection', 
    prefix: 'J', 
    description: 'Billing inquiries and collection matters',
    icon: 'Receipt'
  },
  { 
    type: ServiceType.UNDERWRITING, 
    label: 'Underwriting Policy', 
    prefix: 'K', 
    description: 'New policy underwriting and adjustments',
    icon: 'ClipboardCheck'
  },
  { 
    type: ServiceType.DISABILITY_DEATH, 
    label: 'Disability, Death Benefit', 
    prefix: 'L', 
    description: 'Claims for disability or death benefits',
    icon: 'HeartPulse'
  },
];