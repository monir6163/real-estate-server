import { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
