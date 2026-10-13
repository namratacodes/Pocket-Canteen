export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  canteenId: string | null;
}

export interface AuthResultDTO {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
  isNewUser?: boolean;
}

export interface CanteenDTO {
  id: string;
  name: string;
  location: string;
  tokenPrefix: string;
  isOpen: boolean;
  openNow: boolean;
  operatingHours: { open: string; close: string };
}

export function toUserDTO(u: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  canteenId: string | null;
}): UserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    canteenId: u.canteenId,
  };
}
