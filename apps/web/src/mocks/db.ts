import type { User } from '@/types';

export interface MockUserRecord {
  user: User;
  secret: string; // password or fixed OTP
  isDisabled?: boolean;
}

export const mockUsers: MockUserRecord[] = [
  {
    user: {
      id: 'usr_student_1',
      name: 'Shubh K.',
      phone: '+919876543210',
      role: 'student',
      canteenId: null,
    },
    secret: '123456', // OTP
  },
  {
    user: {
      id: 'usr_staff_1',
      name: 'Ramesh Kumar',
      phone: '+919876543211',
      email: 'staff@main.pc',
      role: 'staff',
      canteenId: 'canteen_main',
      canteenName: 'Main Canteen',
      mustChangePassword: false,
    },
    secret: 'Staff@123',
  },
  {
    user: {
      id: 'usr_admin_1',
      name: 'Campus Administrator',
      phone: '+919876543212',
      email: 'admin@pc.in',
      role: 'admin',
      canteenId: null,
      mustChangePassword: false,
    },
    secret: 'Admin@123',
  },
  {
    user: {
      id: 'usr_staff_temp',
      name: 'Priya Sharma',
      phone: '+919876543213',
      email: 'new@main.pc',
      role: 'staff',
      canteenId: 'canteen_main',
      canteenName: 'Main Canteen',
      mustChangePassword: true,
    },
    secret: 'Temp@123',
  },
];
