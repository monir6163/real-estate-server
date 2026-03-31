import { UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IUser } from "./user.interface";

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (users as IUser[]) || [];
};

const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });
  return updatedUser as IUser;
};

const updateProfile = async (
  userId: string,
  data: { name?: string; phone?: string; image?: string },
) => {
  console.log(userId, data);
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone && { phone: data.phone }),
      ...(data.image && { image: data.image }),
    },
  });
  return updatedUser as IUser;
};

export const UserService = {
  getAllUsers,
  updateUserStatus,
  updateProfile,
};
