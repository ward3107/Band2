import { render, screen, fireEvent } from '@testing-library/react';
import { StatsGrid } from '../StatsGrid';
import { ClassCard } from '../ClassCard';
import { RecentActivity } from '../RecentActivity';
import { BottomNav } from '../BottomNav';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/teacher/dashboard',
}));

// Mock stats data
const mockStats = [
  { icon: 'groups', label: 'Active Students', value: 124 },
  { icon: 'clipboard-list', label: 'Pending Tasks', value: 12 },
  { icon: 'trending-up', label: 'Class Avg.', value: '88%' },
  { icon: 'menu_book', label: 'New Words', value: 45 },
];

// Mock activities
const mockActivities = [
  {
    icon: 'description',
    title: 'Vocabulary Quiz #4 Graded',
    description: 'Advanced English 101',
    time: '2 hours ago',
    color: 'blue' as const,
  },
  {
    icon: 'person_add',
    title: '3 New Students Joined',
    description: 'Creative Writing',
    time: '5 hours ago',
    color: 'purple' as const,
  },
];

describe('StatsGrid', () => {
  it('renders all stat cards', () => {
    render(<StatsGrid stats={mockStats} />);

    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('124')).toBeInTheDocument();
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });
});

describe('ClassCard', () => {
  const mockProps = {
    id: '1',
    name: 'Advanced English 101',
    studentCount: 32,
    progressPercent: 75,
    gradientIndex: 0,
    onManageClick: jest.fn(),
  };

  it('renders class card with correct information', () => {
    render(<ClassCard {...mockProps} />);

    expect(screen.getByText('Advanced English 101')).toBeInTheDocument();
    expect(screen.getByText(/32 Students/)).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = render(<ClassCard {...mockProps} />);
    const progressBar = container.querySelector('.bg-white');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls onManageClick when manage button is clicked', () => {
    const handleClick = jest.fn();
    render(<ClassCard {...mockProps} onManageClick={handleClick} />);

    const manageButton = screen.getByRole('button', { name: /Manage/i });
    fireEvent.click(manageButton);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('RecentActivity', () => {
  it('renders activity items', () => {
    render(<RecentActivity activities={mockActivities} />);

    expect(screen.getByText('Vocabulary Quiz #4 Graded')).toBeInTheDocument();
    expect(screen.getByText('3 New Students Joined')).toBeInTheDocument();
  });

  it('renders section header', () => {
    render(<RecentActivity activities={mockActivities} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });
});

describe('BottomNav', () => {
  const mockItems = [
    { icon: 'dashboard', label: 'Dashboard', href: '/teacher/dashboard' },
    { icon: 'group', label: 'Classes', href: '/teacher/classes' },
    { icon: 'assignment', label: 'Tasks', href: '/teacher/assignments' },
  ];

  it('renders all navigation items', () => {
    render(<BottomNav items={mockItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });
});
